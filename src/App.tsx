import { useRef, useState } from 'react'
import { LinkForm, type Problem } from './components/LinkForm'
import { RecentLinks } from './components/RecentLinks'
import { ShortLinkResult } from './components/ShortLinkResult'
import { Wordmark } from './components/Wordmark'
import { Toaster } from './components/ui/sonner'
import { shortenLink, type ShortLink } from './lib/api'
import { addToHistory, loadHistory, saveHistory } from './lib/history'
import { checkUrl } from './lib/validate-url'

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

  const handleValueChange = (value: string) => {
    setInput(value)
    if (problem) setProblem(null)
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col px-4 pt-[16vh] pb-16">
      <Wordmark />
      <div className="mt-10">
        <LinkForm
          value={input}
          onValueChange={handleValueChange}
          onSubmit={() => void submit()}
          pending={pending}
          problem={problem}
          inputRef={inputRef}
        />
      </div>
      <div aria-live="polite" className="mt-2">
        {current && (
          <>
            <p className="sr-only">Short link ready: {current.shortUrl}</p>
            <ShortLinkResult key={current.code} link={current} />
          </>
        )}
      </div>
      {earlier.length > 0 && (
        <div className="mt-10">
          <RecentLinks links={earlier} />
        </div>
      )}
      <Toaster position="bottom-center" />
    </main>
  )
}
