import { Fragment } from 'react'
import type { ShortLink } from '../lib/api'
import { displayUrl, splitShortUrl } from '../lib/format'
import { copyLabel, useCopy } from '../lib/use-copy'

export function Coupon({ link }: { link: ShortLink }) {
  const { state, copy } = useCopy()
  const parts = splitShortUrl(link.shortUrl, link.code)

  return (
    <div className="coupon-enter">
      <div className="coupon flex min-h-36 overflow-hidden rounded-2xl bg-brand text-on-brand">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-5 pr-4 pl-5 sm:pl-7">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block min-w-0 rounded-md"
          >
            <span className="block text-sm leading-snug [overflow-wrap:anywhere] text-on-brand/85">
              {parts.host.split(/(?<=\.)/).map((segment, index) => (
                <Fragment key={index}>
                  {index > 0 && <wbr />}
                  <span className="whitespace-nowrap">{segment}</span>
                </Fragment>
              ))}
            </span>
            <span className="block text-[2.5rem] leading-none font-bold tracking-[0.02em] underline decoration-on-brand/40 decoration-2 underline-offset-[6px] group-hover:decoration-on-brand sm:text-6xl">
              {parts.code}
            </span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <p className="truncate text-sm text-on-brand/90" title={link.url}>
            <span className="sr-only">Goes to </span>
            {displayUrl(link.url)}
          </p>
        </div>
        <div className="coupon-stub flex shrink-0 items-stretch p-2 pl-3">
          <button
            type="button"
            onClick={() => copy(link.shortUrl)}
            className="w-full cursor-pointer rounded-lg text-base font-bold transition-colors hover:bg-on-brand/15 active:bg-on-brand/25"
          >
            {copyLabel(state)}
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Short link copied.' : ''}
      </p>
    </div>
  )
}
