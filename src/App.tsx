import { useRef, useState, type FormEvent } from 'react'
import { Coupon } from './components/Coupon'
import { LinkHistory } from './components/LinkHistory'
import { shortenLink, type ShortLink } from './lib/api'
import { addToHistory, loadHistory, saveHistory } from './lib/history'
import { checkUrl } from './lib/validate-url'

type Problem = { kind: 'invalid'; message: string } | { kind: 'unavailable' } | null

export default function App() {
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<Problem>(null)
  const [current, setCurrent] = useState<ShortLink | null>(null)
  const [history, setHistory] = useState<ShortLink[]>(loadHistory)
  const inFlight = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const earlier = history.filter((link) => link.code !== current?.code)

  const submit = async () => {
    if (inFlight.current) return

    const check = checkUrl(input)
    if (!check.ok) {
      setProblem({ kind: 'invalid', message: check.message })
      inputRef.current?.focus()
      return
    }

    inFlight.current = true
    setPending(true)
    setProblem(null)

    const result = await shortenLink(check.url)

    inFlight.current = false
    setPending(false)

    if (result.ok) {
      const next = addToHistory(history, result.link)
      saveHistory(next)
      setHistory(next)
      setCurrent(result.link)
      setInput('')
      return
    }

    if (result.kind === 'rejected') {
      setProblem({ kind: 'invalid', message: result.message })
      inputRef.current?.focus()
    } else {
      setProblem({ kind: 'unavailable' })
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit()
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-20 sm:px-8 sm:pt-10">
        <header className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" width={28} height={28} className="rounded-md" />
          <span className="text-base font-bold">Dealseek links</span>
        </header>

        <main className="mt-14 sm:mt-20">
          <h1 className="max-w-[14ch] font-display text-[3.25rem] leading-[0.92] font-extrabold tracking-[-0.01em] text-balance sm:text-[5.25rem]">
            Paste a long link. Share a short one.
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-muted">
            Deal pages come with long tracking links. Turn one into a link you can drop into a chat or post.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8">
            <label htmlFor="url" className="mb-2 block text-sm font-bold">
              Long link
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                ref={inputRef}
                id="url"
                name="url"
                type="url"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="example.com/deal"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value)
                  if (problem?.kind === 'invalid') setProblem(null)
                }}
                aria-invalid={problem?.kind === 'invalid'}
                aria-describedby={problem ? 'url-problem' : undefined}
                className="min-h-13 min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-4 text-lg text-ink placeholder:text-muted/70 focus-visible:outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 aria-[invalid=true]:border-danger"
              />
              <button
                type="submit"
                aria-disabled={pending}
                className="min-h-13 cursor-pointer rounded-xl bg-brand px-7 text-lg font-bold text-on-brand transition-colors hover:bg-brand-press aria-disabled:cursor-progress aria-disabled:opacity-80"
              >
                {pending ? 'Shortening…' : 'Shorten'}
              </button>
            </div>
            <div id="url-problem" aria-live="polite" className="min-h-7 pt-2">
              {problem?.kind === 'invalid' && (
                <p className="text-sm font-bold text-danger">{problem.message}</p>
              )}
              {problem?.kind === 'unavailable' && (
                <p className="text-sm text-danger">
                  <span className="font-bold">Couldn’t reach the link service.</span> Check your connection, then{' '}
                  <button
                    type="button"
                    onClick={() => void submit()}
                    className="cursor-pointer rounded-sm font-bold underline underline-offset-2"
                  >
                    try again
                  </button>
                  .
                </p>
              )}
            </div>
          </form>

          <div aria-live="polite" className="mt-4">
            {current && (
              <>
                <p className="sr-only">Short link ready: {current.shortUrl}</p>
                <Coupon key={current.code} link={current} />
              </>
            )}
          </div>

          {earlier.length > 0 && <LinkHistory links={earlier} />}
        </main>
      </div>
    </div>
  )
}
