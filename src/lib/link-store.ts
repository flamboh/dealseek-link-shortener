import { useSyncExternalStore } from 'react'
import type { ShortLink } from './api'
import { addToHistory, loadHistory, saveHistory } from './history'

export type LinkState = {
  current: ShortLink | null
  history: ShortLink[]
  arrivingCode: string | null
}

let state: LinkState | null = null
const listeners = new Set<() => void>()

function getState(): LinkState {
  state ??= { current: null, history: loadHistory(), arrivingCode: null }
  return state
}

function setState(next: LinkState) {
  if (next.history !== getState().history) saveHistory(next.history)
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLinkState(): LinkState {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function showNewLink(link: ShortLink) {
  const { current, history } = getState()
  setState({ current: link, history: addToHistory(history, link), arrivingCode: current?.code ?? null })
}

export function addEarlierLink(link: ShortLink) {
  const { current, history } = getState()
  const withLink = addToHistory(history, link)
  setState({ ...getState(), history: current ? addToHistory(withLink, current) : withLink })
}

export function clearCurrent() {
  setState({ ...getState(), current: null, arrivingCode: null })
}

export function clearHistory() {
  setState({ current: null, history: [], arrivingCode: null })
}
