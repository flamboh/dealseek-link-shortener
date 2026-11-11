import type { ShortLink } from '../lib/api'
import { displayUrl, formatCreatedAt, splitShortUrl } from '../lib/format'
import { copyLabel, useCopy } from '../lib/use-copy'

export function LinkHistory({ links }: { links: ShortLink[] }) {
  return (
    <section aria-labelledby="history-heading" className="mt-14">
      <h2 id="history-heading" className="text-lg font-bold">
        Earlier links from this browser
      </h2>
      <ul className="mt-3 border-t border-line">
        {links.map((link) => (
          <HistoryRow key={link.code} link={link} />
        ))}
      </ul>
    </section>
  )
}

function HistoryRow({ link }: { link: ShortLink }) {
  const { state, copy } = useCopy()
  const parts = splitShortUrl(link.shortUrl, link.code)
  const created = formatCreatedAt(link.createdAt)

  return (
    <li className="flex items-center gap-3 border-b border-line py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm text-lg font-bold tracking-[0.02em] text-brand-ink underline decoration-brand-ink/30 underline-offset-4 hover:decoration-brand-ink"
            title={link.shortUrl}
          >
            {parts.code}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {created && (
            <time dateTime={link.createdAt} className="truncate text-xs text-muted">
              {created}
            </time>
          )}
        </div>
        <p className="truncate text-sm text-muted" title={link.url}>
          {displayUrl(link.url)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => copy(link.shortUrl)}
        aria-label={state === 'idle' ? `Copy ${link.shortUrl}` : copyLabel(state)}
        className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-line bg-surface px-4 text-sm font-bold transition-colors hover:border-brand hover:text-brand-ink"
      >
        {copyLabel(state)}
      </button>
    </li>
  )
}
