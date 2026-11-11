import { isCode } from './codes'
import { hashOwnerToken, visitorHash } from './hash'
import type { LinkStats, LinkStatsSnapshot } from './link-stats'

export const MAX_STATS_LINKS = 50

export interface StatsQuery {
  code: string
  token: string
}

export type ParsedStatsRequest = { ok: true; links: StatsQuery[] } | { ok: false; error: string }

export function parseStatsRequest(body: unknown): ParsedStatsRequest {
  const links = typeof body === 'object' && body !== null ? (body as { links?: unknown }).links : undefined
  if (!Array.isArray(links)) return { ok: false, error: 'Send a JSON body like {"links": [{"code": "...", "token": "..."}]}.' }
  if (links.length > MAX_STATS_LINKS) return { ok: false, error: `Ask for at most ${MAX_STATS_LINKS} links at a time.` }
  return {
    ok: true,
    links: links.filter(
      (item): item is StatsQuery =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as StatsQuery).code === 'string' &&
        typeof (item as StatsQuery).token === 'string',
    ),
  }
}

export async function readStats(
  db: D1Database,
  namespace: DurableObjectNamespace<LinkStats>,
  links: StatsQuery[],
): Promise<Record<string, LinkStatsSnapshot>> {
  const tokens = new Map<string, string[]>()
  for (const { code, token } of links) if (isCode(code) && token) tokens.set(code, [...(tokens.get(code) ?? []), token])
  if (tokens.size === 0) return {}

  const codes = [...tokens.keys()]
  const { results } = await db
    .prepare(
      `SELECT code, owner_token_hash FROM links WHERE owner_token_hash IS NOT NULL AND code IN (${codes.map(() => '?').join(', ')})`,
    )
    .bind(...codes)
    .all<{ code: string; owner_token_hash: string }>()

  const allowed = await Promise.all(
    results.map(async (row) => {
      const hashes = await Promise.all((tokens.get(row.code) ?? []).map(hashOwnerToken))
      return hashes.includes(row.owner_token_hash) ? row.code : null
    }),
  )

  const stats: Record<string, LinkStatsSnapshot> = {}
  await Promise.all(
    allowed.map(async (code) => {
      if (code === null) return
      try {
        const { clicks, visitors } = await namespace.getByName(code).stats()
        stats[code] = { clicks, visitors }
      } catch (error) {
        console.error('read link stats failed', code, error)
      }
    }),
  )
  return stats
}

export async function recordClick(
  namespace: DurableObjectNamespace<LinkStats>,
  code: string,
  request: Request,
  salt: string | undefined,
): Promise<void> {
  if (!salt) throw new Error('VISITOR_SALT is not set')
  const visitor = await visitorHash(request, salt)
  await namespace.getByName(code).record(visitor)
}
