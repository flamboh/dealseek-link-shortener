const BOT_PATTERN =
  /(?<!cu)bot|crawler|spider|preview|slurp|facebookexternalhit|facebookcatalog|whatsapp|embedly|iframely|vkshare|skypeuripreview|pinterest|mastodon/i

export function isBot(userAgent: string | null): boolean {
  if (!userAgent?.trim()) return true
  return BOT_PATTERN.test(userAgent)
}

export function shouldCountClick(request: Request): boolean {
  if (request.method !== 'GET') return false
  const purpose = `${request.headers.get('sec-purpose') ?? ''} ${request.headers.get('purpose') ?? ''}`
  if (/prefetch|prerender/i.test(purpose)) return false
  return !isBot(request.headers.get('user-agent'))
}
