export interface LinkCache {
  get(code: string): Promise<string | null>
  put(code: string, url: string): Promise<void>
}

export const CACHE_TTL_SECONDS = 60 * 60 * 24

export function kvLinkCache(kv: KVNamespace, ttlSeconds = CACHE_TTL_SECONDS): LinkCache {
  return {
    get: (code) => kv.get(`link:${code}`),
    put: (code, url) => kv.put(`link:${code}`, url, { expirationTtl: ttlSeconds }),
  }
}
