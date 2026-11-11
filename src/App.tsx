import { useRef, useState, type CSSProperties } from 'react'
import { LayoutGroup, MotionConfig } from 'motion/react'
import { LinkForm, type Problem } from './components/LinkForm'
import { RecentLinks } from './components/RecentLinks'
import { ShortLinkResult } from './components/ShortLinkResult'
import { Wordmark } from './components/Wordmark'
import { linkTransition } from './components/motion'
import { shortenLink } from './lib/api'
import { showNewLink, useLinkState } from './lib/link-store'
import { checkUrl, sameUrl } from './lib/validate-url'

export default function App() {
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<Problem>(null)
  const { current, history, arrivingCode } = useLinkState()
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

    if (current && sameUrl(current.url, check.url)) {
      setProblem(null)
      setInput('')
      return
    }

    inFlight.current = true
    setPending(true)
    setProblem(null)

    const result = await shortenLink(check.url)

    inFlight.current = false
    setPending(false)

    if (result.ok) {
      showNewLink(result.link)
      setInput('')
      return
    }

    if (result.kind === 'rejected') {
      setProblem({ kind: 'invalid', message: result.message })
      inputRef.current?.focus()
    } else if (result.kind === 'rate-limited') {
      setProblem({ kind: 'rate-limited', message: result.message, retryAfter: result.retryAfter })
    } else {
      setProblem({ kind: 'unavailable' })
    }
  }

  const handleValueChange = (value: string) => {
    setInput(value)
    if (problem) setProblem(null)
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col px-4 pt-[16vh] pb-16">
      <div className="load-in" style={{ '--i': 0 } as CSSProperties}>
        <Wordmark />
      </div>
      <div className="load-in mt-10" style={{ '--i': 1 } as CSSProperties}>
        <LinkForm
          value={input}
          onValueChange={handleValueChange}
          onSubmit={() => void submit()}
          pending={pending}
          problem={problem}
          inputRef={inputRef}
        />
      </div>
      <MotionConfig reducedMotion="user" transition={linkTransition}>
        <LayoutGroup>
          <div aria-live="polite" className="mt-2">
            {current && (
              <>
                <p className="sr-only">Short link ready: {current.shortUrl}</p>
                <ShortLinkResult key={current.code} link={current} />
              </>
            )}
          </div>
          <div className={earlier.length > 0 ? 'load-in mt-10' : 'load-in'} style={{ '--i': 2 } as CSSProperties}>
            {earlier.length > 0 && <RecentLinks links={earlier} arrivingCode={arrivingCode} />}
          </div>
        </LayoutGroup>
      </MotionConfig>
    </main>
  )
}
