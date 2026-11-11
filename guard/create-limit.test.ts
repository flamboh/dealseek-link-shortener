import { describe, expect, it } from 'vitest'
import {
  attemptCreate,
  type CreateDecision,
  DECAY_MS,
  EMPTY_STATE,
  forgetAt,
  type LimitState,
  MAX_BLOCK_MS,
  MAX_LEVEL,
  WINDOW_MS,
} from './create-limit'

const MINUTE = 60 * 1000
const START = Date.UTC(2026, 10, 11, 12)

function run(state: LimitState, at: number): { state: LimitState; decision: CreateDecision } {
  return attemptCreate(state, at)
}

function burst(start: LimitState, at: number, count: number): { state: LimitState; decisions: CreateDecision[] } {
  let state = start
  const decisions: CreateDecision[] = []
  for (let i = 0; i < count; i++) {
    const result = run(state, at + i)
    state = result.state
    decisions.push(result.decision)
  }
  return { state, decisions }
}

function blockUntilRejected(start: LimitState, at: number): { state: LimitState; retryAfter: number } {
  const { state, decisions } = burst(start, at, 21)
  expect(decisions.slice(0, 20).every((decision) => decision.allowed)).toBe(true)
  const last = decisions[20]
  if (last.allowed) throw new Error('expected the 21st create to be blocked')
  return { state, retryAfter: last.retryAfter }
}

describe('create limit window', () => {
  it('allows 20 creates in the window and blocks the 21st for one minute', () => {
    const { retryAfter, state } = blockUntilRejected(EMPTY_STATE, START)
    expect(retryAfter).toBe(60)
    expect(state.level).toBe(1)
  })

  it('rolls the window so old creates stop counting', () => {
    let { state } = burst(EMPTY_STATE, START, 20)
    const rejected = run(state, START + WINDOW_MS - 1)
    expect(rejected.decision.allowed).toBe(false)

    state = burst(EMPTY_STATE, START, 20).state
    const allowed = run(state, START + 19 + WINDOW_MS)
    expect(allowed.decision.allowed).toBe(true)
  })

  it('does not extend a block when the client keeps trying during it', () => {
    const blocked = blockUntilRejected(EMPTY_STATE, START).state
    const during = run(blocked, blocked.blockedUntil - 30 * 1000)
    expect(during.decision).toEqual({ allowed: false, retryAfter: 30 })
    expect(during.state).toBe(blocked)

    const after = run(during.state, blocked.blockedUntil)
    expect(after.decision.allowed).toBe(true)
  })
})

describe('create limit backoff', () => {
  it('doubles the block each time the limit is hit again', () => {
    let state = EMPTY_STATE
    let at = START
    const lengths: number[] = []
    for (let i = 0; i < 5; i++) {
      const result = blockUntilRejected(state, at)
      lengths.push(result.retryAfter)
      state = result.state
      at = state.blockedUntil
    }
    expect(lengths).toEqual([60, 120, 240, 480, 960])
  })

  it('caps blocks at 24 hours', () => {
    let state = EMPTY_STATE
    let at = START
    let longest = 0
    for (let i = 0; i < 20; i++) {
      const result = blockUntilRejected(state, at)
      longest = Math.max(longest, result.retryAfter)
      state = result.state
      at = state.blockedUntil
    }
    expect(longest).toBe(MAX_BLOCK_MS / 1000)
    expect(state.level).toBe(MAX_LEVEL)
  })

  it('drops one level after each quiet hour following a block', () => {
    let state = blockUntilRejected(EMPTY_STATE, START).state
    state = blockUntilRejected(state, state.blockedUntil).state
    state = blockUntilRejected(state, state.blockedUntil).state
    expect(state.level).toBe(3)

    const notYet = blockUntilRejected(state, state.blockedUntil + DECAY_MS - 1000)
    expect(notYet.retryAfter).toBe(480)

    const twoHoursLater = blockUntilRejected(state, state.blockedUntil + 2 * DECAY_MS)
    expect(twoHoursLater.retryAfter).toBe(120)

    const fullyRecovered = blockUntilRejected(state, state.blockedUntil + 3 * DECAY_MS)
    expect(fullyRecovered.retryAfter).toBe(60)
  })

  it('counts quiet time from the end of the block, not from later creates', () => {
    let state = blockUntilRejected(EMPTY_STATE, START).state
    const quietFrom = state.blockedUntil
    state = burst(state, quietFrom + 30 * MINUTE, 5).state
    expect(state.level).toBe(1)
    state = run(state, quietFrom + DECAY_MS).state
    expect(state.level).toBe(0)
  })
})

describe('forgetAt', () => {
  it('waits for the window, the block, and the decay to pass', () => {
    const allowed = run(EMPTY_STATE, START).state
    expect(forgetAt(allowed)).toBe(START + WINDOW_MS)

    const blocked = blockUntilRejected(EMPTY_STATE, START).state
    expect(forgetAt(blocked)).toBe(blocked.blockedUntil + DECAY_MS)
  })
})
