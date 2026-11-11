import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { hashOwnerToken } from '../hash'
import { insertRow, postLink, postStats, send } from './helpers'

type Created = { code: string; ownerToken: string }
type StatsBody = { stats: Record<string, { clicks: number; visitors: number }> }

const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

async function create(url = 'https://example.com/tracked'): Promise<Created> {
  return (await postLink({ url })).json<Created>()
}

function visit(code: string, userAgent: string, ip = '203.0.113.7', method = 'GET'): Promise<Response> {
  return send(`/${code}`, { method, headers: { 'user-agent': userAgent, 'cf-connecting-ip': ip } })
}

async function statsFor(link: Created) {
  const response = await postStats({ links: [{ code: link.code, token: link.ownerToken }] })
  return (await response.json<StatsBody>()).stats[link.code]
}

describe('owner token', () => {
  it('returns a random token on create and stores only its hash', async () => {
    const first = await create()
    const second = await create()
    expect(first.ownerToken).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(second.ownerToken).not.toBe(first.ownerToken)

    const row = await env.DB.prepare('SELECT * FROM links WHERE code = ?').bind(first.code).first<Record<string, unknown>>()
    expect(row?.owner_token_hash).toBe(await hashOwnerToken(first.ownerToken))
    expect(Object.values(row ?? {})).not.toContain(first.ownerToken)
  })
})

describe('click recording', () => {
  it('starts at zero', async () => {
    expect(await statsFor(await create())).toEqual({ clicks: 0, visitors: 0 })
  })

  it('counts every click and each visitor once', async () => {
    const link = await create()
    await visit(link.code, SAFARI)
    expect(await statsFor(link)).toEqual({ clicks: 1, visitors: 1 })
    await visit(link.code, SAFARI)
    expect(await statsFor(link)).toEqual({ clicks: 2, visitors: 1 })
    await visit(link.code, CHROME)
    expect(await statsFor(link)).toEqual({ clicks: 3, visitors: 2 })
    await visit(link.code, CHROME, '198.51.100.20')
    expect(await statsFor(link)).toEqual({ clicks: 4, visitors: 3 })
  })

  it('keeps each link separate', async () => {
    const a = await create()
    const b = await create()
    await visit(a.code, SAFARI)
    expect(await statsFor(a)).toEqual({ clicks: 1, visitors: 1 })
    expect(await statsFor(b)).toEqual({ clicks: 0, visitors: 0 })
  })

  it('does not count HEAD requests, bots, or prefetches', async () => {
    const link = await create()
    expect((await visit(link.code, SAFARI, '203.0.113.7', 'HEAD')).status).toBe(302)
    expect((await visit(link.code, 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)')).status).toBe(302)
    expect((await visit(link.code, 'facebookexternalhit/1.1')).status).toBe(302)
    expect((await visit(link.code, '')).status).toBe(302)
    const prefetch = await send(`/${link.code}`, { headers: { 'user-agent': CHROME, 'sec-purpose': 'prefetch' } })
    expect(prefetch.status).toBe(302)
    expect(await statsFor(link)).toEqual({ clicks: 0, visitors: 0 })
  })

  it('does not count misses', async () => {
    expect((await visit('Zzzzzzzz', SAFARI)).status).toBe(404)
  })

  it('still redirects when the stats store throws', async () => {
    const link = await create('https://example.com/still-works')
    const broken = {
      ...env,
      LINK_STATS: {
        getByName() {
          throw new Error('stats store down')
        },
      },
    } as unknown as Env
    const response = await send(`/${link.code}`, { headers: { 'user-agent': SAFARI } }, broken)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/still-works')
  })

  it('still redirects when the stats write rejects', async () => {
    const link = await create('https://example.com/still-works-too')
    const broken = {
      ...env,
      LINK_STATS: { getByName: () => ({ record: () => Promise.reject(new Error('write failed')) }) },
    } as unknown as Env
    const response = await send(`/${link.code}`, { headers: { 'user-agent': SAFARI } }, broken)
    expect(response.status).toBe(302)
  })
})

describe('POST /api/stats', () => {
  it('returns stats only for codes with a matching token', async () => {
    const mine = await create()
    const other = await create()
    await insertRow('Ldrw2222', 'https://example.com/before-stats')
    await visit(mine.code, SAFARI)
    await visit(other.code, SAFARI)

    const response = await postStats({
      links: [
        { code: mine.code, token: mine.ownerToken },
        { code: other.code, token: mine.ownerToken },
        { code: 'Ldrw2222', token: mine.ownerToken },
        { code: 'Nwhr2222', token: mine.ownerToken },
        { code: 'not a code', token: mine.ownerToken },
        { code: other.code, token: '' },
        { code: other.code },
        'junk',
        null,
      ],
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ stats: { [mine.code]: { clicks: 1, visitors: 1 } } })
  })

  it('allows a code listed twice when either token matches', async () => {
    const link = await create()
    const response = await postStats({
      links: [
        { code: link.code, token: link.ownerToken },
        { code: link.code, token: 'wrong' },
      ],
    })
    expect((await response.json<StatsBody>()).stats[link.code]).toEqual({ clicks: 0, visitors: 0 })
  })

  it('returns stats for many links in one request', async () => {
    const links = await Promise.all(Array.from({ length: 3 }, () => create()))
    await visit(links[1].code, SAFARI)
    const response = await postStats({ links: links.map((link) => ({ code: link.code, token: link.ownerToken })) })
    const body = await response.json<StatsBody>()
    expect(Object.keys(body.stats).sort()).toEqual(links.map((link) => link.code).sort())
    expect(body.stats[links[1].code]).toEqual({ clicks: 1, visitors: 1 })
  })

  it('accepts 50 links and rejects 51', async () => {
    const entries = Array.from({ length: 51 }, () => ({ code: 'Bcdfghjk', token: 'x' }))
    expect((await postStats({ links: entries.slice(0, 50) })).status).toBe(200)
    const tooMany = await postStats({ links: entries })
    expect(tooMany.status).toBe(400)
    expect((await tooMany.json<{ error: string }>()).error).toContain('50')
  })

  it.each([
    ['invalid json', '{"links":'],
    ['missing links', {}],
    ['links not a list', { links: 'abc' }],
  ])('rejects %s with a 400', async (_, body) => {
    expect((await postStats(body)).status).toBe(400)
  })

  it('returns an empty map for an empty list', async () => {
    expect(await (await postStats({ links: [] })).json()).toEqual({ stats: {} })
  })

  it('rejects other methods', async () => {
    expect((await send('/api/stats')).status).toBe(405)
  })
})
