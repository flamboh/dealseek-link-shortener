export type UrlCheck = { ok: true; url: string } | { ok: false; message: string }

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i
const OTHER_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i

export function checkUrl(input: string): UrlCheck {
  const value = input.trim()

  if (!value) {
    return { ok: false, message: 'Paste a link to shorten.' }
  }

  if (/\s/.test(value)) {
    return { ok: false, message: 'Links can’t contain spaces. Check that you pasted one link.' }
  }

  if (!HAS_SCHEME.test(value) && OTHER_SCHEME.test(value)) {
    return { ok: false, message: 'Only web links (http or https) can be shortened.' }
  }

  const withScheme = HAS_SCHEME.test(value) ? value : `https://${value}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return { ok: false, message: 'That isn’t a valid link. Try something like example.com/deal.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: 'Only web links (http or https) can be shortened.' }
  }

  const host = parsed.hostname
  const looksLikeHost = host === 'localhost' || (host.includes('.') && !host.endsWith('.'))
  if (!looksLikeHost) {
    return {
      ok: false,
      message: `“${host || value}” is missing a domain ending like .com. Try something like example.com/deal.`,
    }
  }

  return { ok: true, url: withScheme }
}
