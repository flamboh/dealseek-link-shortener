import { useState, type ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, Cancel01Icon, Link02Icon, PreferenceHorizontalIcon } from '@hugeicons/core-free-icons'
import { shortenLink } from '../../lib/api'
import { addEarlierLink, clearCurrent, clearHistory, useLinkState } from '../../lib/link-store'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { seedUrls } from './seed-urls'
import { arm, setSticky, simulations, useSimulation, withoutSimulation } from './simulation'

const OPEN_KEY = 'dealseek-links:dev-panel-open'

type SeedStatus =
  | { kind: 'idle' }
  | { kind: 'running'; done: number; total: number }
  | { kind: 'finished'; done: number; total: number; error: string | null }

function readOpen() {
  try {
    return window.localStorage.getItem(OPEN_KEY) === 'true'
  } catch {
    return false
  }
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(OPEN_KEY, String(open))
  } catch {
    return
  }
}

const smallButton = 'h-8 px-3 text-xs'

function SectionTitle({ icon, children }: { icon: typeof Link02Icon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
      {children}
    </div>
  )
}

function seedMessage(status: SeedStatus) {
  if (status.kind === 'running') return `Seeding ${status.done}/${status.total}…`
  if (status.kind === 'finished' && status.error) return `Stopped at ${status.done}/${status.total}: ${status.error}`
  if (status.kind === 'finished') return `Added ${status.done} links`
  return null
}

export function DevPanel() {
  const [open, setOpen] = useState(readOpen)
  const [seed, setSeed] = useState<SeedStatus>({ kind: 'idle' })
  const { current, history } = useLinkState()
  const simulation = useSimulation()
  const seeding = seed.kind === 'running'
  const armedLabel = simulations.find((item) => item.kind === simulation.armed)?.label

  const toggle = (next: boolean) => {
    setOpen(next)
    writeOpen(next)
  }

  const runSeed = async (total: number) => {
    setSeed({ kind: 'running', done: 0, total })
    let done = 0
    for (const url of seedUrls(total)) {
      const result = await withoutSimulation(() => shortenLink(url))
      if (!result.ok) {
        setSeed({ kind: 'finished', done, total, error: result.kind === 'unavailable' ? 'server unavailable' : result.message })
        return
      }
      addEarlierLink(result.link)
      done++
      setSeed({ kind: 'running', done, total })
    }
    setSeed({ kind: 'finished', done, total, error: null })
  }

  const message = seedMessage(seed)

  return (
    <div
      className="fixed right-3 bottom-3 z-50 flex flex-col items-end gap-2 sm:right-4 sm:bottom-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') toggle(false)
      }}
    >
      {open && (
        <div
          id="dev-panel"
          role="region"
          aria-label="Dev panel"
          className="max-h-[calc(100svh-5rem)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-border bg-popover/95 text-popover-foreground shadow-xl backdrop-blur"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 pr-2 pl-4">
            <div>
              <p className="text-sm leading-tight font-semibold">dev panel</p>
              <p className="mt-0.5 text-xs text-muted-foreground">local worker · D1 + KV</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => toggle(false)}
              aria-label="Close dev panel"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </div>

          <div className="grid gap-5 p-4">
            <section className="grid gap-3">
              <SectionTitle icon={Link02Icon}>links</SectionTitle>
              <p className="text-xs text-muted-foreground">
                {history.length} in history · {current ? 'card shown' : 'no card'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" className={smallButton} disabled={seeding} onClick={() => void runSeed(5)}>
                  Seed 5
                </Button>
                <Button type="button" className={smallButton} disabled={seeding} onClick={() => void runSeed(20)}>
                  Seed 20
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={smallButton}
                  disabled={seeding || (history.length === 0 && !current)}
                  onClick={() => {
                    clearHistory()
                    setSeed({ kind: 'idle' })
                  }}
                >
                  Clear recent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={smallButton}
                  disabled={!current}
                  onClick={clearCurrent}
                >
                  Clear current
                </Button>
              </div>
              {message && (
                <p
                  aria-live="polite"
                  className={cn('text-xs', seed.kind === 'finished' && seed.error ? 'text-destructive' : 'text-muted-foreground')}
                >
                  {message}
                </p>
              )}
            </section>

            <section className="grid gap-3">
              <SectionTitle icon={Alert02Icon}>simulate create request</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {simulations.map((item) => {
                  const active = simulation.armed === item.kind
                  return (
                    <Button
                      key={item.kind}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      aria-pressed={active}
                      className="h-auto flex-col items-start gap-0 px-3 py-1.5 text-left text-xs"
                      onClick={() => arm(active ? null : item.kind)}
                    >
                      <span>{item.label}</span>
                      <span className={cn('font-normal', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {item.detail}
                      </span>
                    </Button>
                  )
                })}
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-3 py-1.5 text-xs"
                  disabled={!simulation.armed}
                  onClick={() => arm(null)}
                >
                  Turn off
                </Button>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={simulation.sticky}
                  onChange={(event) => setSticky(event.target.checked)}
                  className="size-3.5 accent-primary"
                />
                Keep applying until turned off
              </label>
              <p className="text-xs text-muted-foreground">
                {armedLabel
                  ? `${simulation.sticky ? 'Every request' : 'Next request'}: ${armedLabel.toLowerCase()}`
                  : 'Requests go to the real worker'}
              </p>
            </section>
          </div>
        </div>
      )}
      <Button
        type="button"
        size="icon"
        aria-label={open ? 'Close dev panel' : 'Open dev panel'}
        aria-expanded={open}
        aria-controls="dev-panel"
        onClick={() => toggle(!open)}
        className="relative size-10 rounded-lg border border-foreground/15 bg-foreground text-background shadow-lg hover:bg-foreground/90 active:bg-foreground/80"
      >
        <HugeiconsIcon icon={PreferenceHorizontalIcon} strokeWidth={2} />
        {simulation.armed && (
          <span aria-hidden="true" className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-background bg-primary" />
        )}
      </Button>
    </div>
  )
}
