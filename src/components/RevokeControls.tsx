import { useState, type ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Delete02Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { revokeLink, type ShortLink } from '../lib/api'
import { displayUrl } from '../lib/format'
import { startRemoving } from '../lib/link-store'
import { showToast } from '../lib/toast'
import { cn } from '../lib/utils'

type Step = 'idle' | 'confirming' | 'revoking' | 'failed'

const iconButton =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-md outline-none transition-colors duration-100 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:bg-border disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-accent/50 dark:active:bg-accent'

type RevokeControlsProps = {
  link: ShortLink
  children?: ReactNode
}

export function RevokeControls({ link, children }: RevokeControlsProps) {
  const [step, setStep] = useState<Step>('idle')
  const name = displayUrl(link.shortUrl)

  const confirm = async () => {
    setStep('revoking')
    if (await revokeLink(link)) {
      showToast(`Revoked ${name}`)
      startRemoving(link.code)
    } else {
      setStep('failed')
    }
  }

  if (step === 'idle') {
    return (
      <>
        <button
          type="button"
          aria-label={`Revoke ${link.shortUrl}`}
          onClick={() => setStep('confirming')}
          className={cn(iconButton, 'text-muted-foreground hover:text-destructive')}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
        </button>
        {children}
      </>
    )
  }

  const busy = step === 'revoking'

  return (
    <div
      role="group"
      aria-label={`Revoke ${link.shortUrl}?`}
      className="flex items-center gap-0.5"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) setStep('idle')
      }}
    >
      <span
        role={step === 'failed' ? 'alert' : undefined}
        className={cn('pr-1 text-xs whitespace-nowrap', step === 'failed' ? 'text-destructive' : 'text-muted-foreground')}
      >
        {step === 'failed' ? 'Failed. Retry?' : busy ? 'Revoking…' : 'Revoke?'}
      </span>
      <button
        type="button"
        aria-label={`Yes, revoke ${link.shortUrl}`}
        disabled={busy}
        onClick={() => void confirm()}
        className={cn(iconButton, 'text-destructive')}
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Keep link"
        autoFocus
        disabled={busy}
        onClick={() => setStep('idle')}
        className={cn(iconButton, 'text-muted-foreground hover:text-foreground')}
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
      </button>
    </div>
  )
}
