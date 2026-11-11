import { motion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { LinkSquare02Icon } from '@hugeicons/core-free-icons'
import type { ShortLink } from '../lib/api'
import { displayUrl } from '../lib/format'
import { cn } from '../lib/utils'
import { CopyButton } from './CopyButton'

type LinkSummaryProps = {
  link: ShortLink
  prominent?: boolean
}

export function LinkSummary({ link, prominent = false }: LinkSummaryProps) {
  return (
    <>
      <div className="relative min-w-0 flex-1">
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link flex w-fit max-w-full origin-left items-center gap-1.5 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <motion.span
            layoutId={`${link.code}:short`}
            className={cn(
              'block truncate font-semibold underline decoration-transparent decoration-1 underline-offset-2 transition-[text-decoration-color] duration-150 group-hover/link:decoration-current',
              prominent ? 'text-base leading-6' : 'text-sm leading-5',
            )}
          >
            {displayUrl(link.shortUrl)}
          </motion.span>
          <span className="sr-only"> (opens in a new tab)</span>
          {prominent && (
            <HugeiconsIcon
              icon={LinkSquare02Icon}
              strokeWidth={2}
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground transition-colors duration-150 group-hover/link:text-foreground"
            />
          )}
        </a>
        <motion.p
          layoutId={`${link.code}:url`}
          layout="position"
          className="truncate text-xs leading-4 text-muted-foreground"
          title={link.url}
        >
          {displayUrl(link.url)}
        </motion.p>
      </div>
      <motion.div layoutId={`${link.code}:copy`} layout="position" className="relative">
        <CopyButton text={link.shortUrl} label={`Copy ${link.shortUrl}`} className="size-8" />
      </motion.div>
    </>
  )
}
