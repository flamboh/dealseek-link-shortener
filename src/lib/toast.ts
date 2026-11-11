import { useSyncExternalStore } from 'react'

export type Toast = { id: number; message: string }

const DURATION_MS = 2000

let toast: Toast | null = null
let nextId = 1
let timer: number | undefined
const listeners = new Set<() => void>()

function emit(next: Toast | null) {
  toast = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getToast = () => toast

export function useToast(): Toast | null {
  return useSyncExternalStore(subscribe, getToast, getToast)
}

export function showToast(message: string) {
  window.clearTimeout(timer)
  emit({ id: nextId++, message })
  timer = window.setTimeout(() => emit(null), DURATION_MS)
}
