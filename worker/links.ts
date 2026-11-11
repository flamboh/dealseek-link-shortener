import type { LinkCache } from './cache'
import { isBlocked } from './blocklist'
import { generateCode } from './codes'

export interface Link {
  code: string
  url: string
  createdAt: number
}

const MAX_CODE_ATTEMPTS = 10

export class CodeGenerationError extends Error {}

export async function createLink(
  db: D1Database,
  cache: LinkCache,
  url: string,
  nextCode: () => string = generateCode,
): Promise<Link> {
  const createdAt = Date.now()
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = nextCode()
    if (isBlocked(code)) continue
    const result = await db
      .prepare('INSERT INTO links (code, url, created_at) VALUES (?, ?, ?) ON CONFLICT (code) DO NOTHING')
      .bind(code, url, createdAt)
      .run()
    if (result.meta.changes === 1) {
      await cache.put(code, url)
      return { code, url, createdAt }
    }
  }
  throw new CodeGenerationError(`No free code after ${MAX_CODE_ATTEMPTS} attempts`)
}

export async function resolveLink(
  db: D1Database,
  cache: LinkCache,
  code: string,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<string | null> {
  const cached = await cache.get(code)
  if (cached !== null) return cached
  const row = await db.prepare('SELECT url FROM links WHERE code = ?').bind(code).first<{ url: string }>()
  if (!row) return null
  waitUntil(cache.put(code, row.url))
  return row.url
}
