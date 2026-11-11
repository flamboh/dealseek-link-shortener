export type ShortLink = {
  code: string
  shortUrl: string
  url: string
  createdAt: string
  ownerToken?: string
}

export type LinkStats = {
  clicks: number
  visitors: number
}

export const MAX_STATS_LINKS = 50

export type ShortenResult =
  | { ok: true; link: ShortLink }
  | { ok: false; kind: 'rejected'; message: string }
  | { ok: false; kind: 'rate-limited'; message: string; retryAfter: number | null }
  | { ok: false; kind: 'unavailable' }

type SendRequest = () => Promise<Response>

export const devRequestHook: { intercept: ((send: SendRequest) => Promise<Response>) | null } = { intercept: null }

export function isShortLink(value: unknown): value is ShortLink {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.code === 'string' &&
    typeof record.shortUrl === 'string' &&
    typeof record.url === 'string' &&
    typeof record.createdAt === 'string' &&
    (record.ownerToken === undefined || typeof record.ownerToken === 'string')
  )
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function errorMessage(body: unknown): string | null {
  const message = (body as { error?: unknown } | null)?.error
  return typeof message === 'string' && message.trim() ? message : null
}

function retryAfterSeconds(response: Response, body: unknown): number | null {
  const fromBody = (body as { retryAfter?: unknown } | null)?.retryAfter
  if (typeof fromBody === 'number' && Number.isFinite(fromBody) && fromBody >= 0) return fromBody
  const fromHeader = Number(response.headers.get('Retry-After'))
  return response.headers.has('Retry-After') && Number.isFinite(fromHeader) ? fromHeader : null
}

export async function shortenLink(url: string): Promise<ShortenResult> {
  const send: SendRequest = () =>
    fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url }),
    })

  let response: Response
  try {
    response = await (import.meta.env.DEV && devRequestHook.intercept ? devRequestHook.intercept(send) : send())
  } catch {
    return { ok: false, kind: 'unavailable' }
  }

  const body = await readJson(response)

  if (response.status === 201 && isShortLink(body)) {
    return { ok: true, link: body }
  }

  if (response.status === 400) {
    const message = errorMessage(body)
    if (message) return { ok: false, kind: 'rejected', message }
  }

  if (response.status === 429) {
    return {
      ok: false,
      kind: 'rate-limited',
      message: errorMessage(body) ?? 'You’re making links too quickly. Try again in a few minutes.',
      retryAfter: retryAfterSeconds(response, body),
    }
  }

  return { ok: false, kind: 'unavailable' }
}

function isLinkStats(value: unknown): value is LinkStats {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.clicks === 'number' && typeof record.visitors === 'number'
}

export async function fetchStats(links: ShortLink[]): Promise<Record<string, LinkStats> | null> {
  const queries = links
    .filter((link) => link.ownerToken)
    .slice(0, MAX_STATS_LINKS)
    .map((link) => ({ code: link.code, token: link.ownerToken }))
  if (queries.length === 0) return {}

  let response: Response
  try {
    response = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ links: queries }),
    })
  } catch {
    return null
  }
  if (!response.ok) return null

  const stats = ((await readJson(response)) as { stats?: unknown } | null)?.stats
  if (typeof stats !== 'object' || stats === null) return null
  return Object.fromEntries(Object.entries(stats).filter((entry): entry is [string, LinkStats] => isLinkStats(entry[1])))
}

export async function revokeLink(link: ShortLink): Promise<boolean> {
  const token = link.ownerToken
  if (!token) return false
  const send: SendRequest = () =>
    fetch(`/api/links/${encodeURIComponent(link.code)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  try {
    const response = await (import.meta.env.DEV && devRequestHook.intercept ? devRequestHook.intercept(send) : send())
    return response.status === 204
  } catch {
    return false
  }
}
