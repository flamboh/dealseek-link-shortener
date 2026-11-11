import { useSyncExternalStore } from 'react'
import { devRequestHook } from '../../lib/api'

export type SimulationKind = 'rate-limited' | 'blocked' | 'server-error' | 'network' | 'slow'

export const simulations: Array<{ kind: SimulationKind; label: string; detail: string }> = [
  { kind: 'rate-limited', label: 'Rate limited', detail: '429, retry in 240s' },
  { kind: 'blocked', label: 'Blocked link', detail: '400' },
  { kind: 'server-error', label: 'Server error', detail: '500' },
  { kind: 'network', label: 'Offline', detail: 'fetch rejects' },
  { kind: 'slow', label: 'Slow', detail: '+2s delay' },
]

export type SimulationState = { armed: SimulationKind | null; sticky: boolean }

let state: SimulationState = { armed: null, sticky: false }
let bypassing = 0
const listeners = new Set<() => void>()

function setState(next: SimulationState) {
  devRequestHook.intercept = intercept
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getState = () => state

export function useSimulation(): SimulationState {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function arm(kind: SimulationKind | null) {
  setState({ ...state, armed: kind })
}

export function setSticky(sticky: boolean) {
  setState({ ...state, sticky })
}

export async function withoutSimulation<T>(run: () => Promise<T>): Promise<T> {
  bypassing++
  try {
    return await run()
  } finally {
    bypassing--
  }
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

async function intercept(send: () => Promise<Response>): Promise<Response> {
  const kind = state.armed
  if (!kind || bypassing > 0) return send()
  if (!state.sticky) setState({ ...state, armed: null })

  switch (kind) {
    case 'rate-limited':
      return jsonResponse(
        429,
        { error: "You're making links too quickly. Try again in 4 minutes.", retryAfter: 240 },
        { 'Retry-After': '240' },
      )
    case 'blocked':
      return jsonResponse(400, { error: "That link can't be shortened." })
    case 'server-error':
      return jsonResponse(500, { error: 'Something went wrong while saving your link. Please try again.' })
    case 'network':
      await wait(300)
      throw new TypeError('Failed to fetch')
    case 'slow':
      await wait(2000)
      return send()
  }
}
