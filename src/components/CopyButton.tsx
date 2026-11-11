import { useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { copyText } from '../lib/clipboard'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { IconSwap } from './ui/icon-swap'

type Outcome = 'copied' | 'failed'

const messages: Record<Outcome, string> = {
  copied: 'Copied',
  failed: 'Couldn’t copy',
}

type CopyButtonProps = {
  text: string
  label: string
  className?: string
}

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [shown, setShown] = useState<Outcome | null>(null)
  const [lastOutcome, setLastOutcome] = useState<Outcome>('copied')
  const revertTimer = useRef<number | undefined>(undefined)

  const handleClick = async () => {
    const outcome: Outcome = (await copyText(text)) ? 'copied' : 'failed'
    window.clearTimeout(revertTimer.current)
    setShown(outcome)
    setLastOutcome(outcome)
    revertTimer.current = window.setTimeout(() => setShown(null), outcome === 'copied' ? 1500 : 2500)
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={shown ? messages[shown] : label}
        data-state={shown ?? 'idle'}
        onClick={() => void handleClick()}
        className={cn(
          'text-muted-foreground hover:text-foreground data-[state=copied]:text-foreground data-[state=failed]:text-destructive',
          className,
        )}
      >
        <IconSwap
          switched={shown !== null}
          first={<HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-4" />}
          second={
            <HugeiconsIcon
              icon={lastOutcome === 'copied' ? Tick02Icon : Alert02Icon}
              strokeWidth={2}
              className="size-4"
            />
          }
        />
      </Button>
      <span role="status" className="sr-only">
        {shown ? messages[shown] : ''}
      </span>
    </>
  )
}
