import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { insertRow, ORIGIN, postLink, send } from './helpers'

describe('POST /api/links', () => {
  it('creates a link and returns the contract shape', async () => {
    const response = await postLink({ url: 'https://example.com/deals?id=1' })
    expect(response.status).toBe(201)
    const body = await response.json<Record<string, string>>()
    expect(body.code).toMatch(/^[256789BCDFGHJ-NP-TV-XZbcdfghjkmnp-tv-xz]{8}$/)
    expect(body.shortUrl).toBe(`${ORIGIN}/${body.code}`)
    expect(body.url).toBe('https://example.com/deals?id=1')
    expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt)

    const row = await env.DB.prepare('SELECT url FROM links WHERE code = ?').bind(body.code).first<{ url: string }>()
    expect(row?.url).toBe('https://example.com/deals?id=1')
    expect(await env.LINK_CACHE.get(`link:${body.code}`)).toBe('https://example.com/deals?id=1')
  })

  it.each([
    ['missing url', {}],
    ['empty url', { url: '   ' }],
    ['not a url', { url: 'not a url' }],
    ['non-http scheme', { url: 'ftp://example.com/file' }],
    ['javascript scheme', { url: 'javascript:alert(1)' }],
    ['too long', { url: `https://example.com/${'a'.repeat(2048)}` }],
    ['own host', { url: `${ORIGIN}/abc` }],
    ['invalid json', '{"url":'],
  ])('rejects %s with a 400 and a message', async (_, body) => {
    const response = await postLink(body)
    expect(response.status).toBe(400)
    const result = await response.json<{ error: string }>()
    expect(result.error.length).toBeGreaterThan(0)
  })

  it('rejects other methods', async () => {
    const response = await send('/api/links')
    expect(response.status).toBe(405)
  })
})

describe('GET /:code', () => {
  it('redirects a created link with a 302', async () => {
    const created = await (await postLink({ url: 'https://example.com/a' })).json<{ code: string }>()
    const response = await send(`/${created.code}`)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/a')
  })

  it('returns a 404 page linking home for an unknown code', async () => {
    const response = await send('/ZZZZZZZZ')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('href="/"')
  })

  it.each([
    'bcd',
    'bcdfghj',
    'bcdfghjkm',
    'bcdfghja',
    'bcdfghjE',
    'bcdfghjy',
    'bcdfghj0',
    'bcdfghjO',
    'bcdfghj1',
    'bcdfghjl',
    'bcdfghjI',
    'bcdfghj3',
    'bcdfghj4',
  ])(
    'does not treat %s as a code',
    async (path) => {
      await insertRow(path, 'https://example.com/should-not-resolve')
      const response = await send(`/${path}`)
      expect(response.status).toBe(404)
    },
  )
})

describe('cache', () => {
  it('fills the cache from D1 on a miss', async () => {
    await insertRow('Mss2Kpq7', 'https://example.com/from-d1')
    expect(await env.LINK_CACHE.get('link:Mss2Kpq7')).toBeNull()

    const response = await send('/Mss2Kpq7')
    expect(response.headers.get('location')).toBe('https://example.com/from-d1')
    expect(await env.LINK_CACHE.get('link:Mss2Kpq7')).toBe('https://example.com/from-d1')
  })

  it('serves from the cache without touching D1 on a hit', async () => {
    await env.LINK_CACHE.put('link:Ht2Kq9Bz', 'https://example.com/from-cache')

    const response = await send('/Ht2Kq9Bz')
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/from-cache')
  })
})
