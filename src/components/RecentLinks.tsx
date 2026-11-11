import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon } from '@hugeicons/core-free-icons'
import type { ShortLink } from '../lib/api'
import { displayUrl } from '../lib/format'
import { copyLink } from './copy-link'
import { Button } from './ui/button'

export function RecentLinks({ links }: { links: ShortLink[] }) {
  return (
    <section aria-labelledby="recent-label">
      <h2 id="recent-label" className="text-xs font-medium text-muted-foreground">
        Recent
      </h2>
      <ul className="mt-2 divide-y divide-border border-y border-border">
        {links.map((link) => (
          <li key={link.code} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <a
                href={link.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit max-w-full truncate rounded-sm text-sm font-semibold outline-none hover:underline hover:underline-offset-2 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {displayUrl(link.shortUrl)}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <p className="truncate text-xs text-muted-foreground" title={link.url}>
                {displayUrl(link.url)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Copy ${link.shortUrl}`}
              onClick={() => void copyLink(link.shortUrl)}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
