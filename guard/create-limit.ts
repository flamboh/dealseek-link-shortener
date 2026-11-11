export const WINDOW_MS = 10 * 60 * 1000
export const MAX_CREATES_PER_WINDOW = 20
export const FIRST_BLOCK_MS = 60 * 1000
export const MAX_BLOCK_MS = 24 * 60 * 60 * 1000
export const DECAY_MS = 60 * 60 * 1000
export const MAX_LEVEL = Math.ceil(Math.log2(MAX_BLOCK_MS / FIRST_BLOCK_MS))

export interface LimitState {
  hits: number[]
  level: number
  blockedUntil: number
  decayFrom: number
}

export type CreateDecision = { allowed: true } | { allowed: false; retryAfter: number }

export const EMPTY_STATE: LimitState = { hits: [], level: 0, blockedUntil: 0, decayFrom: 0 }

export function blockLength(level: number): number {
  return Math.min(FIRST_BLOCK_MS * 2 ** level, MAX_BLOCK_MS)
}

function retryAfterSeconds(blockedUntil: number, now: number): number {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000))
}

function decay(state: LimitState, now: number): LimitState {
  if (state.level === 0 || now < state.decayFrom) return state
  const steps = Math.floor((now - state.decayFrom) / DECAY_MS)
  if (steps === 0) return state
  const level = Math.max(0, state.level - steps)
  return { ...state, level, decayFrom: level === 0 ? 0 : state.decayFrom + steps * DECAY_MS }
}

export function attemptCreate(previous: LimitState, now: number): { state: LimitState; decision: CreateDecision } {
  if (now < previous.blockedUntil) {
    return { state: previous, decision: { allowed: false, retryAfter: retryAfterSeconds(previous.blockedUntil, now) } }
  }

  const decayed = decay(previous, now)
  const hits = decayed.hits.filter((at) => at > now - WINDOW_MS)

  if (hits.length < MAX_CREATES_PER_WINDOW) {
    return { state: { ...decayed, hits: [...hits, now] }, decision: { allowed: true } }
  }

  const blockedUntil = now + blockLength(decayed.level)
  const state: LimitState = {
    hits: [],
    level: Math.min(decayed.level + 1, MAX_LEVEL),
    blockedUntil,
    decayFrom: blockedUntil,
  }
  return { state, decision: { allowed: false, retryAfter: retryAfterSeconds(blockedUntil, now) } }
}

export function forgetAt(state: LimitState): number {
  const lastHit = state.hits.length > 0 ? Math.max(...state.hits) + WINDOW_MS : 0
  const levelGone = state.level > 0 ? state.decayFrom + state.level * DECAY_MS : 0
  return Math.max(lastHit, state.blockedUntil, levelGone)
}
