import { kvLinkCache } from './cache'
import { isCode } from './codes'
import { createLink, resolveLink } from './links'
import { NOT_FOUND_HTML } from './pages'
import { checkUrl } from './validate'

function json(body: unknown, status: number, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } })
}

function notFoundPage(): Response {
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}

async function handleCreate(request: Request, env: Env): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Send a JSON body like {"url": "https://example.com"}.' }, 400)
  }
  const input = typeof body === 'object' && body !== null ? (body as { url?: unknown }).url : undefined
  const origin = new URL(request.url)
  const check = checkUrl(input, origin.hostname)
  if (!check.ok) return json({ error: check.error }, 400)

  const link = await createLink(env.DB, kvLinkCache(env.LINK_CACHE), check.url)
  return json(
    {
      code: link.code,
      shortUrl: `${origin.origin}/${link.code}`,
      url: link.url,
      createdAt: new Date(link.createdAt).toISOString(),
    },
    201,
  )
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === '/api/links') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' })
      try {
        return await handleCreate(request, env)
      } catch (error) {
        console.error('create link failed', error)
        return json({ error: 'Something went wrong while saving your link. Please try again.' }, 500)
      }
    }

    if (pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404)

    const code = pathname.slice(1)
    if ((request.method === 'GET' || request.method === 'HEAD') && isCode(code)) {
      const url = await resolveLink(env.DB, kvLinkCache(env.LINK_CACHE), code, (p) => ctx.waitUntil(p))
      if (url) {
        return new Response(null, { status: 302, headers: { location: url, 'cache-control': 'no-store' } })
      }
    }

    return notFoundPage()
  },
} satisfies ExportedHandler<Env>
