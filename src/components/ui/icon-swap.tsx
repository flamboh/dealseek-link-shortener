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
          'absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out motion-reduce:transition-none',
          switched ? 'opacity-0' : 'opacity-100',
        )}
      >
        {first}
      </span>
      <span
        data-icon-swap="second"
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out motion-reduce:transition-none',
          switched ? 'opacity-100' : 'opacity-0',
        )}
      >
        {second}
      </span>
    </span>
  )
}
