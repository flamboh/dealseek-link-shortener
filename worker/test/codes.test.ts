import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { BLOCKLIST, isBlocked, normalizeCode } from '../blocklist'
import { kvLinkCache } from '../cache'
import { CODE_ALPHABET, generateCode, isCode, type RandomBytes } from '../codes'
import { CodeGenerationError, createLink } from '../links'
import { insertRow } from './helpers'

function bytesFor(code: string): number[] {
  return [...code].map((ch) => CODE_ALPHABET.indexOf(ch))
}

function queuedBytes(bytes: number[]): RandomBytes {
  const queue = [...bytes]
  return (count) =>
    Uint8Array.from({ length: count }, () => {
      const next = queue.shift()
      if (next === undefined) throw new Error('random source exhausted')
      return next
    })
}

describe('codes', () => {
  it('uses exactly the 45 allowed characters', () => {
    expect(CODE_ALPHABET).toHaveLength(45)
    expect(new Set(CODE_ALPHABET).size).toBe(45)
    expect(CODE_ALPHABET).toBe('256789' + 'BCDFGHJKLMNPQRSTVWXZ' + 'bcdfghjkmnpqrstvwxz')
    for (const ch of 'aeiouyAEIOUY0O1lI34') expect(CODE_ALPHABET).not.toContain(ch)
  })

  it('generates 8-character codes from the alphabet', () => {
    for (let i = 0; i < 2000; i++) {
      const code = generateCode()
      expect(code).toHaveLength(8)
      expect(isCode(code)).toBe(true)
    }
  })

  it('maps random bytes to characters and skips bytes that would bias the result', () => {
    const source = queuedBytes([0, 255, 45, 230, 6, 26, 44, 225, 1, 2, 3])
    expect(generateCode(source)).toBe('22Bbz567')
  })

  it('retries with a new code on a primary-key collision', async () => {
    await insertRow('Tkn22222', 'https://example.com/original')
    const codes = ['Tkn22222', 'Frsh2222']
    const link = await createLink(env.DB, kvLinkCache(env.LINK_CACHE), 'https://example.com/new', () => codes.shift()!)
    expect(link.code).toBe('Frsh2222')
    const original = await env.DB.prepare('SELECT url FROM links WHERE code = ?').bind('Tkn22222').first<{ url: string }>()
    expect(original?.url).toBe('https://example.com/original')
  })

  it('gives up after repeated collisions', async () => {
    await insertRow('Stck2222', 'https://example.com/original')
    await expect(
      createLink(env.DB, kvLinkCache(env.LINK_CACHE), 'https://example.com/new', () => 'Stck2222'),
    ).rejects.toBeInstanceOf(CodeGenerationError)
  })
})

describe('blocklist', () => {
  it('normalizes case and digit look-alikes', () => {
    expect(normalizeCode('5H7Bx289')).toBe('shtbxzbg')
    expect(normalizeCode('F67kkkMN')).toBe('fgtkkkmn')
  })

  it('only contains fragments a normalized code could spell', () => {
    for (const entry of BLOCKLIST) expect(entry).toMatch(/^[bcdfghjklmnpqrstvwxz]{3,}$/)
  })

  it('flags codes containing a blocked fragment, including digit substitutions', () => {
    expect(isBlocked('zzFCKzzz')).toBe(true)
    expect(isBlocked('Bx5h7zzz')).toBe(true)
    expect(isBlocked('BCDFGHJK')).toBe(false)
  })

  it('rerolls a blocked code from the random source', async () => {
    const source = queuedBytes([...bytesFor('Q5H7mnpq'), ...bytesFor('Qmnpqrst')])
    const link = await createLink(env.DB, kvLinkCache(env.LINK_CACHE), 'https://example.com/clean', () =>
      generateCode(source),
    )
    expect(link.code).toBe('Qmnpqrst')
    const blocked = await env.DB.prepare('SELECT 1 FROM links WHERE code = ?').bind('Q5H7mnpq').first()
    expect(blocked).toBeNull()
  })
})
