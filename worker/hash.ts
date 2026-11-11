const encoder = new TextEncoder()

async function sha256(text: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', encoder.encode(text))
}

export async function hash64(text: string): Promise<bigint> {
  return new DataView(await sha256(text)).getBigUint64(0)
}

export function visitorHash(request: Request, salt: string): Promise<bigint> {
  const ip = request.headers.get('cf-connecting-ip') ?? ''
  const userAgent = request.headers.get('user-agent') ?? ''
  return hash64(`${salt}\n${ip}\n${userAgent}`)
}

export function newOwnerToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function hashOwnerToken(token: string): Promise<string> {
  return [...new Uint8Array(await sha256(token))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
