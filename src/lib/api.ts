export type ShortLink = {
  code: string
  shortUrl: string
  url: string
  createdAt: string
}

export type ShortenResult =
  | { ok: true; link: ShortLink }
  | { ok: false; kind: 'rejected'; message: string }
  | { ok: false; kind: 'unavailable' }

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

export async function shortenLink(url: string): Promise<ShortenResult> {
  let response: Response
  try {
    response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch {
    return { ok: false, kind: 'unavailable' }
  }

  const body = await readJson(response)

  if (response.status === 201 && isShortLink(body)) {
    return { ok: true, link: body }
  }

  if (response.status === 400) {
    const message = (body as { error?: unknown } | null)?.error
    if (typeof message === 'string' && message.trim()) {
      return { ok: false, kind: 'rejected', message }
    }
  }

  return { ok: false, kind: 'unavailable' }
}
