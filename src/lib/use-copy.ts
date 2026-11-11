import { useRef, useState } from 'react'
import { copyText } from './clipboard'

export type CopyState = 'idle' | 'copied' | 'failed'

export function useCopy(resetAfterMs = 1800) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | undefined>(undefined)

  const copy = async (text: string) => {
    const ok = await copyText(text)
    setState(ok ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), resetAfterMs)
  }

  return { state, copy }
}

export function copyLabel(state: CopyState): string {
  if (state === 'copied') return 'Copied'
  if (state === 'failed') return 'Copy failed'
  return 'Copy'
}
