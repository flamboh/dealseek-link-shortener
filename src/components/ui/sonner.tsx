import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { cn } from '../../lib/utils'

const Toaster = ({ className, toastOptions, ...props }: ToasterProps) => (
  <Sonner
    theme="system"
    toastOptions={{ ...toastOptions, className: cn('font-sans', toastOptions?.className) }}
    className={cn('toaster group', className)}
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--error-bg': 'var(--popover)',
        '--error-border': 'var(--border)',
        '--error-text': 'var(--popover-foreground)',
        '--border-radius': 'var(--radius)',
      } as CSSProperties
    }
    {...props}
  />
)

export { Toaster }
