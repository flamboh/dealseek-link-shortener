export function splitShortUrl(shortUrl: string, code: string): { host: string; code: string } {
  try {
    const parsed = new URL(shortUrl)
    const path = parsed.pathname.replace(/^\//, '')
    return { host: `${parsed.host}/`, code: path || code }
  } catch {
    return { host: '', code: shortUrl }
  }
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatCreatedAt(iso: string): string | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date)
}
