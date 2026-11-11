import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type IconSwapProps = {
  switched: boolean
  first: ReactNode
  second: ReactNode
  className?: string
}

export function IconSwap({ switched, first, second, className }: IconSwapProps) {
  return (
    <span
      data-icon-swap-state={switched ? 'second' : 'first'}
      className={cn('pointer-events-none relative size-4', className)}
      aria-hidden="true"
    >
      <span
        data-icon-swap="first"
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-[opacity,filter,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:delay-0',
          switched ? 'scale-50 opacity-0 blur-[2px] delay-0' : 'blur-none scale-100 opacity-100 delay-[40ms]',
        )}
      >
        {first}
      </span>
      <span
        data-icon-swap="second"
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-[opacity,filter,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:delay-0',
          switched ? 'blur-none scale-100 opacity-100 delay-[40ms]' : 'scale-50 opacity-0 blur-[2px] delay-0',
        )}
      >
        {second}
      </span>
    </span>
  )
}
