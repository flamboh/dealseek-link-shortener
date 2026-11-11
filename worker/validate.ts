export const MAX_URL_LENGTH = 2048

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string }

export function checkUrl(input: unknown, ownHost: string): UrlCheck {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, error: 'Please enter a URL.' }
  }
  const raw = input.trim()
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, error: `That URL is too long. The limit is ${MAX_URL_LENGTH} characters.` }
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL. Include the http:// or https:// part." }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http:// and https:// links can be shortened.' }
  }
  if (parsed.hostname.toLowerCase() === ownHost.toLowerCase()) {
    return { ok: false, error: "That link already points at this site, so it can't be shortened." }
  }
  if (parsed.href.length > MAX_URL_LENGTH) {
    return { ok: false, error: `That URL is too long. The limit is ${MAX_URL_LENGTH} characters.` }
  }
  return { ok: true, url: parsed.href }
}
