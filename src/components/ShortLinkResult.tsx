import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, LinkSquare02Icon } from '@hugeicons/core-free-icons'
import type { ShortLink } from '../lib/api'
import { displayUrl } from '../lib/format'
import { copyLink } from './copy-link'
import { Button } from './ui/button'

export function ShortLinkResult({ link }: { link: ShortLink }) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={link.shortUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-semibold shadow-xs transition-[color,box-shadow] outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:bg-input/30"
      >
        <span className="min-w-0 flex-1 truncate">{displayUrl(link.shortUrl)}</span>
        <span className="sr-only">(opens in a new tab)</span>
        <HugeiconsIcon
          icon={LinkSquare02Icon}
          strokeWidth={2}
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
        />
      </a>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Copy short link"
        onClick={() => void copyLink(link.shortUrl)}
        className="size-10 rounded-lg"
      >
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}
