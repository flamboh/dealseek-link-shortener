import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import worker from '../index'

export const ORIGIN = 'https://links.example'

export type SendOptions = { ip?: string; env?: Env }

export async function send(path: string, init?: RequestInit, options: SendOptions = {}): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (options.ip) headers.set('cf-connecting-ip', options.ip)
  const request = new Request(`${ORIGIN}${path}`, { redirect: 'manual', ...init, headers })
  const ctx = createExecutionContext()
  const response = await worker.fetch(request as Request<unknown, IncomingRequestCfProperties>, options.env ?? env, ctx)
  await waitOnExecutionContext(ctx)
  return response
}

export function postLink(body: unknown, options?: SendOptions): Promise<Response> {
  return send(
    '/api/links',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    options,
  )
}

export async function insertRow(code: string, url: string): Promise<void> {
  await env.DB.prepare('INSERT INTO links (code, url, created_at) VALUES (?, ?, ?)').bind(code, url, Date.now()).run()
}

export function postStats(body: unknown): Promise<Response> {
  return send('/api/stats', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
