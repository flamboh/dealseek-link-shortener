import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { kvLinkCache, REVOKED } from '../cache'
import { createLink } from '../links'
import { insertRow, postLink, postStats, send } from './helpers'

type Created = { code: string; ownerToken: string }

const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

async function create(url = 'https://example.com/revocable'): Promise<Created> {
  return (await postLink({ url })).json<Created>()
}

function revoke(code: string, token?: string, scheme = 'Bearer'): Promise<Response> {
  return send(`/api/links/${code}`, {
    method: 'DELETE',
    headers: token === undefined ? {} : { authorization: `${scheme} ${token}` },
  })
}

function revokedAt(code: string): Promise<number | null | undefined> {
  return env.DB.prepare('SELECT revoked_at FROM links WHERE code = ?')
    .bind(code)
    .first<number | null>('revoked_at')
    .then((value) => value ?? null)
}

describe('DELETE /api/links/:code', () => {
  it('revokes a link for its owner and serves a 410 page after', async () => {
    const link = await create()
    const response = await revoke(link.code, link.ownerToken)
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')

    const row = await env.DB.prepare('SELECT url, revoked_at FROM links WHERE code = ?')
      .bind(link.code)
      .first<{ url: string; revoked_at: number | null }>()
    expect(row?.url).toBe('https://example.com/revocable')
    expect(row?.revoked_at).toBeTypeOf('number')
    expect(await env.LINK_CACHE.get(`link:${link.code}`)).toBe(REVOKED)

    const gone = await send(`/${link.code}`)
    expect(gone.status).toBe(410)
    expect(gone.headers.get('content-type')).toContain('text/html')
    const html = await gone.text()
    expect(html).toContain('This link was removed by its creator.')
    expect(html).toContain('href="/"')

    expect((await send(`/${link.code}`, { method: 'HEAD' })).status).toBe(410)
  })

  it('is idempotent for the owner and keeps the first revoke time', async () => {
    const link = await create()
    await revoke(link.code, link.ownerToken)
    const first = await revokedAt(link.code)
    expect((await revoke(link.code, link.ownerToken)).status).toBe(204)
    expect(await revokedAt(link.code)).toBe(first)
  })

  it('returns the same 404 for a wrong token, a missing token, and an unknown code', async () => {
    const link = await create()
    const other = await create()
    const responses = [
      await revoke(link.code, other.ownerToken),
      await revoke(link.code, ''),
      await revoke(link.code),
      await revoke(link.code, link.ownerToken, 'Basic'),
      await revoke('Nwhr2229', link.ownerToken),
      await revoke('not-a-code', link.ownerToken),
    ]
    for (const response of responses) {
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'Link not found.' })
    }
    expect(await revokedAt(link.code)).toBeNull()
    expect((await send(`/${link.code}`)).status).toBe(302)
  })

  it('cannot revoke links made before owner tokens existed', async () => {
    await insertRow('Ldrw2229', 'https://example.com/legacy')
    expect((await revoke('Ldrw2229', 'anything')).status).toBe(404)
    expect((await send('/Ldrw2229')).status).toBe(302)
  })

  it('rejects other methods', async () => {
    const link = await create()
    expect((await send(`/api/links/${link.code}`)).status).toBe(405)
    expect((await send(`/api/links/${link.code}`, { method: 'POST' })).status).toBe(405)
  })
})

describe('revoked links', () => {
  it('trusts the cache tombstone without asking D1', async () => {
    await insertRow('Tmbs2222', 'https://example.com/still-in-d1')
    await env.LINK_CACHE.put('link:Tmbs2222', REVOKED)
    expect((await send('/Tmbs2222')).status).toBe(410)
  })

  it('serves a 410 from D1 on a cache miss and writes the tombstone', async () => {
    await env.DB.prepare('INSERT INTO links (code, url, created_at, revoked_at) VALUES (?, ?, ?, ?)')
      .bind('Rvkd2222', 'https://example.com/revoked', Date.now(), Date.now())
      .run()
    expect(await env.LINK_CACHE.get('link:Rvkd2222')).toBeNull()
    expect((await send('/Rvkd2222')).status).toBe(410)
    expect(await env.LINK_CACHE.get('link:Rvkd2222')).toBe(REVOKED)
  })

  it('never reissues a revoked code', async () => {
    const link = await create('https://example.com/original-owner')
    await revoke(link.code, link.ownerToken)
    const codes = [link.code, 'Frsh2229']
    const fresh = await createLink(env.DB, kvLinkCache(env.LINK_CACHE), 'https://example.com/new-owner', () => codes.shift()!)
    expect(fresh.code).toBe('Frsh2229')
    expect((await send(`/${link.code}`)).status).toBe(410)
  })

  it('stops counting clicks', async () => {
    const link = await create()
    await send(`/${link.code}`, { headers: { 'user-agent': SAFARI } })
    await revoke(link.code, link.ownerToken)
    await send(`/${link.code}`, { headers: { 'user-agent': SAFARI } })
    await send(`/${link.code}`, { headers: { 'user-agent': 'Mozilla/5.0 Firefox/140.0' } })
    const stats = await (await postStats({ links: [{ code: link.code, token: link.ownerToken }] })).json<{
      stats: Record<string, { clicks: number; visitors: number }>
    }>()
    expect(stats.stats[link.code]).toEqual({ clicks: 1, visitors: 1 })
  })
})
