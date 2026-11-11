import type { FormEvent, RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight02Icon, Link02Icon } from '@hugeicons/core-free-icons'
import { loaderCircleIcon } from './icons/loader-circle'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { cn } from '../lib/utils'
import { linkTransition } from './motion'
import { tooManyLinksMessage } from '../../shared/wait'

export type Problem =
  | { kind: 'invalid'; message: string }
  | { kind: 'rate-limited'; message: string; retryAfter: number | null }
  | { kind: 'unavailable' }
  | { kind: 'available-again' }
  | null

type LinkFormProps = {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  pending: boolean
  problem: Problem
  waitLeft: number | null
  alreadyShortened: boolean
  inputRef: RefObject<HTMLInputElement | null>
}

export function LinkForm({
  value,
  onValueChange,
  onSubmit,
  pending,
  problem,
  waitLeft,
  alreadyShortened,
  inputRef,
}: LinkFormProps) {
  const reduceMotion = useReducedMotion()
  const closed = reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
  const open = reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="relative">
          <HugeiconsIcon
            icon={Link02Icon}
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            type="url"
            name="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={value}
            readOnly={pending}
            aria-label="Link to shorten"
            aria-invalid={problem?.kind === 'invalid'}
            aria-describedby="url-problem"
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="Paste a link"
            className={cn('h-10 rounded-lg pl-9 placeholder:text-muted-foreground/60', alreadyShortened && 'rounded-b-none')}
          />
        </div>
        <div role="status">
          <AnimatePresence initial={false}>
            {alreadyShortened && (
              <motion.div
                key="already-shortened"
                initial={closed}
                animate={open}
                exit={closed}
                transition={linkTransition}
                className="overflow-hidden"
              >
                <p className="rounded-b-lg border border-t-0 border-input bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
                  You already shortened this link.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {waitLeft !== null && (
          <p aria-hidden="true" className="pt-1 text-xs leading-4 text-destructive">
            {tooManyLinksMessage(waitLeft)}
          </p>
        )}
        <p
          id="url-problem"
          role="status"
          className={cn('pt-1 text-xs leading-4 text-destructive', waitLeft === null ? 'min-h-5' : 'sr-only')}
        >
          {problem?.kind === 'invalid' && problem.message}
          {problem?.kind === 'rate-limited' && problem.message}
          {problem?.kind === 'available-again' && <span className="sr-only">You can make links again.</span>}
          {problem?.kind === 'unavailable' && (
            <>
              Couldn’t reach the server.{' '}
              <button
                type="button"
                onClick={onSubmit}
                className="cursor-pointer rounded-sm font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Try again
              </button>
            </>
          )}
        </p>
      </div>
      <Button
        type="submit"
        size="icon"
        disabled={(!value.trim() && !pending) || waitLeft !== null}
        aria-label="Shorten"
        aria-busy={pending || undefined}
        className="size-10 rounded-lg"
      >
        {pending ? (
          <HugeiconsIcon icon={loaderCircleIcon} strokeWidth={2} className="animate-spin" />
        ) : (
          <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} />
        )}
      </Button>
    </form>
  )
}
