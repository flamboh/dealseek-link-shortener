import type { FormEvent, RefObject } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight02Icon, Link02Icon } from '@hugeicons/core-free-icons'
import { loaderCircleIcon } from './icons/loader-circle'
import { Button } from './ui/button'
import { Input } from './ui/input'

export type Problem = { kind: 'invalid'; message: string } | { kind: 'unavailable' } | null

type LinkFormProps = {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  pending: boolean
  problem: Problem
  inputRef: RefObject<HTMLInputElement | null>
}

export function LinkForm({ value, onValueChange, onSubmit, pending, problem, inputRef }: LinkFormProps) {
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
            className="h-10 rounded-lg pl-9 placeholder:text-muted-foreground/60"
          />
        </div>
        <p id="url-problem" aria-live="polite" className="min-h-5 pt-1 text-xs leading-4 text-destructive">
          {problem?.kind === 'invalid' && problem.message}
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
        disabled={!value.trim() && !pending}
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
