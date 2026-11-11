import { shouldCountClick } from './bots'
import { kvLinkCache } from './cache'
import { isCode } from './codes'
import { createLink, resolveLink, revokeLink } from './links'
import { NOT_FOUND_HTML, REVOKED_HTML } from './pages'
import { parseStatsRequest, readStats, recordClick } from './stats'
import { checkUrl } from './validate'

function json(body: unknown, status: number, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } })
}

function htmlPage(html: string, status: number): Response {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')
  return match ? match[1] : null
}

async function handleRevoke(request: Request, env: Env, code: string): Promise<Response> {
  const token = bearerToken(request)
  if (!isCode(code) || !token || !(await revokeLink(env.DB, kvLinkCache(env.LINK_CACHE), code, token))) {
    return json({ error: 'Link not found.' }, 404)
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
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
      ownerToken: link.ownerToken,
    },
    201,
  )
}

async function handleStats(request: Request, env: Env): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = null
  }
  const parsed = parseStatsRequest(body)
  if (!parsed.ok) return json({ error: parsed.error }, 400)
  return json({ stats: await readStats(env.DB, env.LINK_STATS, parsed.links) }, 200)
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

    if (pathname.startsWith('/api/links/')) {
      if (request.method !== 'DELETE') return json({ error: 'Method not allowed.' }, 405, { allow: 'DELETE' })
      try {
        return await handleRevoke(request, env, pathname.slice('/api/links/'.length))
      } catch (error) {
        console.error('revoke link failed', error)
        return json({ error: 'Something went wrong while removing your link. Please try again.' }, 500)
      }
    }

    if (pathname === '/api/stats') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' })
      try {
        return await handleStats(request, env)
      } catch (error) {
        console.error('read stats failed', error)
        return json({ error: 'Could not load stats right now.' }, 500)
      }
    }

    if (pathname.startsWith('/api/')) return json({ error: 'Not found.' }, 404)

    const code = pathname.slice(1)
    if ((request.method === 'GET' || request.method === 'HEAD') && isCode(code)) {
      const link = await resolveLink(env.DB, kvLinkCache(env.LINK_CACHE), code, (p) => ctx.waitUntil(p))
      if (link.status === 'revoked') return htmlPage(REVOKED_HTML, 410)
      if (link.status === 'active') {
        if (shouldCountClick(request)) {
          ctx.waitUntil(
            recordClick(env.LINK_STATS, code, request, env.VISITOR_SALT).catch((error: unknown) =>
              console.error('record click failed', code, error),
            ),
          )
        }
        return new Response(null, { status: 302, headers: { location: link.url, 'cache-control': 'no-store' } })
      }
    }

    return htmlPage(NOT_FOUND_HTML, 404)
  },
} satisfies ExportedHandler<Env>
