import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'
import { DECAY_MS, type LimitState, WINDOW_MS } from '../../guard/create-limit'
import { clientKey } from '../client-key'
import { checkCreateLimit, type CreateLimiterNamespace } from '../limits'
import { insertRow, postLink, send } from './helpers'

function createFrom(ip: string, index = 0): Promise<Response> {
  return postLink({ url: `https://example.com/item/${index}` }, { ip })
}

async function createMany(ip: string | ((index: number) => string), count: number): Promise<number[]> {
  const statuses: number[] = []
  for (let i = 0; i < count; i++) {
    const response = await createFrom(typeof ip === 'string' ? ip : ip(i), i)
    statuses.push(response.status)
  }
  return statuses
}

function keyOf(ip: string | null): string {
  const headers = ip === null ? undefined : { 'cf-connecting-ip': ip }
  return clientKey(new Request('https://links.example/', { headers }))
}

describe('clientKey', () => {
  it.each([
    ['203.0.113.7', 'ip4:203.0.113.7'],
    ['2001:db8:1:2:3:4:5:6', 'ip6:2001:db8:1:2::/64'],
    ['2001:0DB8:0001:0002::1', 'ip6:2001:db8:1:2::/64'],
    ['2001:db8::', 'ip6:2001:db8:0:0::/64'],
    ['::1', 'ip6:0:0:0:0::/64'],
    ['2001:db8:1:2::ffff:10.0.0.1', 'ip6:2001:db8:1:2::/64'],
    ['::ffff:198.51.100.4', 'ip4:198.51.100.4'],
    ['fe80::1%eth0', 'ip6:fe80:0:0:0::/64'],
    ['not:an:address::zz', 'ip6:not:an:address::zz'],
  ])('keys %s as %s', (ip, key) => {
    expect(keyOf(ip)).toBe(key)
  })

  it('falls back to a shared key without a client address', () => {
    expect(keyOf(null)).toBe('unknown')
  })
})

describe('create rate limit', () => {
  it('allows 20 creates and answers the 21st with a 429 and Retry-After', async () => {
    const statuses = await createMany('198.51.100.10', 20)
    expect(statuses.every((status) => status === 201)).toBe(true)

    const response = await createFrom('198.51.100.10')
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
      error: "You're making links too quickly. Try again in 1 minute.",
      retryAfter: 60,
    })

    expect((await createFrom('198.51.100.11')).status).toBe(201)
  })

  it('does not count rejected input toward the limit', async () => {
    for (let i = 0; i < 25; i++) {
      expect((await postLink({ url: 'not a url' }, { ip: '198.51.100.20' })).status).toBe(400)
    }
    expect((await createFrom('198.51.100.20')).status).toBe(201)
  })

  it('shares one limit across an IPv6 /64', async () => {
    const statuses = await createMany((i) => `2001:db8:aa:bb::${(i + 1).toString(16)}`, 20)
    expect(statuses.every((status) => status === 201)).toBe(true)

    expect((await createFrom('2001:db8:aa:bb:ffff:ffff:ffff:ffff')).status).toBe(429)
    expect((await createFrom('2001:db8:aa:bc::1')).status).toBe(201)
  })

  it('keeps state in the limiter and forgets it once it is idle', async () => {
    const stub = env.CREATE_LIMITER.getByName('test:alarm')
    expect(await stub.attempt()).toEqual({ allowed: true })

    await runInDurableObject(stub, (_, state) => {
      const stored = state.storage.kv.get<LimitState>('state')
      expect(stored?.hits).toHaveLength(1)
      const old = Date.now() - WINDOW_MS - DECAY_MS
      state.storage.kv.put('state', { hits: [old], level: 1, blockedUntil: old, decayFrom: old })
    })
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    await runInDurableObject(stub, (_, state) => {
      expect(state.storage.kv.get('state')).toBeUndefined()
    })
  })
})

describe('create rate limit failure', () => {
  const brokenLimiter = (attempt: () => Promise<never>): CreateLimiterNamespace => ({
    getByName: () => ({ attempt }),
  })

  it('allows the create when the limiter throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const limiter = brokenLimiter(() => Promise.reject(new Error('boom')))
    const response = await postLink(
      { url: 'https://example.com/fail-open' },
      { ip: '198.51.100.30', env: { ...env, CREATE_LIMITER: limiter as unknown as Env['CREATE_LIMITER'] } },
    )
    expect(response.status).toBe(201)
    expect(error).toHaveBeenCalledWith('create limiter unavailable, allowing the request', expect.any(Error))
    error.mockRestore()
  })

  it('allows the create when the limiter is too slow', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const limiter = brokenLimiter(() => new Promise<never>(() => {}))
    expect(await checkCreateLimit(limiter, 'slow', 5)).toEqual({ allowed: true })
    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })
})

describe('lookup rate limit', () => {
  it('allows 30 missing codes a minute, then answers with a 429 page', async () => {
    await insertRow('Rm5Hzt22', 'https://example.com/real')
    for (let i = 0; i < 30; i++) {
      expect((await send('/ZZZZZZZZ', undefined, { ip: '192.0.2.50' })).status).toBe(404)
    }

    const limited = await send('/ZZZZZZZZ', undefined, { ip: '192.0.2.50' })
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBe('60')
    expect(limited.headers.get('content-type')).toContain('text/html')
    expect(await limited.text()).toContain('href="/"')

    const hit = await send('/Rm5Hzt22', undefined, { ip: '192.0.2.50' })
    expect(hit.status).toBe(302)
    expect(hit.headers.get('location')).toBe('https://example.com/real')

    expect((await send('/ZZZZZZZZ', undefined, { ip: '192.0.2.51' })).status).toBe(404)
  })

  it('never counts successful redirects', async () => {
    await insertRow('Rm5Hzt99', 'https://example.com/popular')
    for (let i = 0; i < 60; i++) {
      expect((await send('/Rm5Hzt99', undefined, { ip: '192.0.2.60' })).status).toBe(302)
    }
    for (let i = 0; i < 30; i++) {
      expect((await send('/ZZZZZZZZ', undefined, { ip: '192.0.2.60' })).status).toBe(404)
    }
  })

  it('counts revoked codes as misses', async () => {
    await insertRow('Rvkd2222', 'https://example.com/gone')
    await env.DB.prepare('UPDATE links SET revoked_at = ? WHERE code = ?').bind(Date.now(), 'Rvkd2222').run()
    for (let i = 0; i < 30; i++) {
      expect((await send('/Rvkd2222', undefined, { ip: '192.0.2.80' })).status).toBe(410)
    }
    expect((await send('/Rvkd2222', undefined, { ip: '192.0.2.80' })).status).toBe(429)
  })

  it('does not count paths that are not codes', async () => {
    for (let i = 0; i < 40; i++) {
      expect((await send('/nope', undefined, { ip: '192.0.2.70' })).status).toBe(404)
    }
    expect((await send('/ZZZZZZZZ', undefined, { ip: '192.0.2.70' })).status).toBe(404)
  })
})
