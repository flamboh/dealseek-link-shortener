export type ShortLink = {
  code: string
  shortUrl: string
  url: string
  createdAt: string
}

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
    typeof record.createdAt === 'string'
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
