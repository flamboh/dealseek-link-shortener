import { useSyncExternalStore } from 'react'

export type Toast = { id: number; message: string; image?: string }

const DURATION_MS = 2000
const IMAGE_DURATION_MS = 3000

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

export function showToast(message: string, image?: string) {
  window.clearTimeout(timer)
  emit({ id: nextId++, message, image })
  timer = window.setTimeout(() => emit(null), image ? IMAGE_DURATION_MS : DURATION_MS)
}
