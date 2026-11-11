import { useSyncExternalStore } from 'react'
import { fetchStats, type LinkStats, type ShortLink } from './api'
import { addToHistory, loadHistory, removeFromHistory, saveHistory } from './history'

export type LinkState = {
  current: ShortLink | null
  history: ShortLink[]
  arrivingCode: string | null
  cameFromRecent: boolean
  stats: Record<string, LinkStats>
  removingCodes: string[]
}

let state: LinkState | null = null
let loadingStats = false
const listeners = new Set<() => void>()

function getState(): LinkState {
  state ??= { current: null, history: loadHistory(), arrivingCode: null, cameFromRecent: false, stats: {}, removingCodes: [] }
  return state
}

function withFreshStats(stats: Record<string, LinkStats>, link: ShortLink): Record<string, LinkStats> {
  if (!link.ownerToken || stats[link.code]) return stats
  return { ...stats, [link.code]: { clicks: 0, visitors: 0 } }
}

function setState(next: LinkState) {
  if (next.history !== getState().history) saveHistory(next.history)
  state = next
  for (const listener of listeners) listener()
}

export async function refreshStats() {
  if (loadingStats) return
  loadingStats = true
  const next = await fetchStats(getState().history)
  loadingStats = false
  if (next) setState({ ...getState(), stats: { ...getState().stats, ...next } })
}

function refreshWhenVisible() {
  if (document.visibilityState === 'visible') void refreshStats()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    void refreshStats()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }
}

export function useLinkState(): LinkState {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function useLinkStats(code: string): LinkStats | undefined {
  const getStats = () => getState().stats[code]
  return useSyncExternalStore(subscribe, getStats, getStats)
}

export function showLink(link: ShortLink) {
  const { current, history, stats } = getState()
  if (current?.code === link.code) return
  setState({
    ...getState(),
    current: link,
    history: addToHistory(history, link),
    arrivingCode: current?.code ?? null,
    cameFromRecent: history.some((item) => item.code === link.code),
    stats: withFreshStats(stats, link),
  })
}

export function addEarlierLink(link: ShortLink) {
  const { current, history, stats } = getState()
  const withLink = addToHistory(history, link)
  setState({
    ...getState(),
    history: current ? addToHistory(withLink, current) : withLink,
    stats: withFreshStats(stats, link),
  })
}

export function clearCurrent() {
  setState({ ...getState(), current: null, arrivingCode: null, cameFromRecent: false })
}

export function clearHistory() {
  setState({ current: null, history: [], arrivingCode: null, cameFromRecent: false, stats: {}, removingCodes: [] })
}

export function startRemoving(code: string) {
  const { removingCodes } = getState()
  if (removingCodes.includes(code)) return
  setState({ ...getState(), removingCodes: [...removingCodes, code] })
}

export function finishRemoving(code: string) {
  const { current, history, arrivingCode, cameFromRecent, stats, removingCodes } = getState()
  if (!removingCodes.includes(code)) return
  const { [code]: _removed, ...remainingStats } = stats
  const wasCurrent = current?.code === code
  setState({
    current: wasCurrent ? null : current,
    history: removeFromHistory(history, code),
    arrivingCode: wasCurrent || arrivingCode === code ? null : arrivingCode,
    cameFromRecent: wasCurrent ? false : cameFromRecent,
    stats: remainingStats,
    removingCodes: removingCodes.filter((item) => item !== code),
  })
}
