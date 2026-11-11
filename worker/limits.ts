import type { CreateDecision } from '../guard/create-limit'

export const LIMITER_TIMEOUT_MS = 200

export interface CreateLimiterStub {
  attempt(): Promise<CreateDecision>
}

export interface CreateLimiterNamespace {
  getByName(name: string): CreateLimiterStub
}

function timeout(ms: number): { promise: Promise<never>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`create limiter timed out after ${ms}ms`)), ms)
  })
  return { promise, cancel: () => timer !== undefined && clearTimeout(timer) }
}

export async function checkCreateLimit(
  limiter: CreateLimiterNamespace,
  key: string,
  timeoutMs = LIMITER_TIMEOUT_MS,
): Promise<CreateDecision> {
  const deadline = timeout(timeoutMs)
  try {
    return await Promise.race([limiter.getByName(key).attempt(), deadline.promise])
  } catch (error) {
    console.error('create limiter unavailable, allowing the request', error)
    return { allowed: true }
  } finally {
    deadline.cancel()
  }
}

export async function lookupMissAllowed(limiter: RateLimit, key: string): Promise<boolean> {
  try {
    return (await limiter.limit({ key })).success
  } catch (error) {
    console.error('lookup limiter unavailable, allowing the request', error)
    return true
  }
}
