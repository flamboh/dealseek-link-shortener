import { REVOKED, type LinkCache } from './cache'
import { isBlocked } from './blocklist'
import { generateCode } from './codes'
import { hashOwnerToken, newOwnerToken } from './hash'

export interface Link {
  code: string
  url: string
  createdAt: number
}

export interface CreatedLink extends Link {
  ownerToken: string
}

const MAX_CODE_ATTEMPTS = 10

export class CodeGenerationError extends Error {}

export async function createLink(
  db: D1Database,
  cache: LinkCache,
  url: string,
  nextCode: () => string = generateCode,
): Promise<CreatedLink> {
  const createdAt = Date.now()
  const ownerToken = newOwnerToken()
  const ownerTokenHash = await hashOwnerToken(ownerToken)
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = nextCode()
    if (isBlocked(code)) continue
    const result = await db
      .prepare(
        'INSERT INTO links (code, url, created_at, owner_token_hash) VALUES (?, ?, ?, ?) ON CONFLICT (code) DO NOTHING',
      )
      .bind(code, url, createdAt, ownerTokenHash)
      .run()
    if (result.meta.changes === 1) {
      await cache.put(code, url)
      return { code, url, createdAt, ownerToken }
    }
  }
  throw new CodeGenerationError(`No free code after ${MAX_CODE_ATTEMPTS} attempts`)
}

export type Resolved = { status: 'active'; url: string } | { status: 'revoked' } | { status: 'missing' }

export async function resolveLink(
  db: D1Database,
  cache: LinkCache,
  code: string,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<Resolved> {
  const cached = await cache.get(code)
  if (cached === REVOKED) return { status: 'revoked' }
  if (cached !== null) return { status: 'active', url: cached }
  const row = await db
    .prepare('SELECT url, revoked_at FROM links WHERE code = ?')
    .bind(code)
    .first<{ url: string; revoked_at: number | null }>()
  if (!row) return { status: 'missing' }
  if (row.revoked_at !== null) {
    waitUntil(cache.put(code, REVOKED))
    return { status: 'revoked' }
  }
  waitUntil(cache.put(code, row.url))
  return { status: 'active', url: row.url }
}

export async function revokeLink(db: D1Database, cache: LinkCache, code: string, ownerToken: string): Promise<boolean> {
  const result = await db
    .prepare('UPDATE links SET revoked_at = COALESCE(revoked_at, ?) WHERE code = ? AND owner_token_hash = ?')
    .bind(Date.now(), code, await hashOwnerToken(ownerToken))
    .run()
  if (result.meta.changes !== 1) return false
  await cache.put(code, REVOKED)
  return true
}
