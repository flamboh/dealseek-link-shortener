import { useRef } from 'react'
import { motion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import type { ShortLink } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { displayUrl } from '../lib/format'
import { showToast } from '../lib/toast'
import { cn } from '../lib/utils'

type LinkSummaryProps = {
  link: ShortLink
  prominent?: boolean
}

export function LinkSummary({ link, prominent = false }: LinkSummaryProps) {
  const shortRef = useRef<HTMLSpanElement>(null)

  const copy = async () => {
    if (await copyText(link.shortUrl)) {
      showToast(`Copied ${displayUrl(link.shortUrl)}`)
      return
    }
    if (shortRef.current) window.getSelection()?.selectAllChildren(shortRef.current)
    showToast('Couldn’t copy. Select the link and copy it manually.')
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Copy ${link.shortUrl}`}
        onClick={() => void copy()}
        className={cn(
          'absolute inset-0 cursor-pointer outline-none transition-colors duration-150 hover:bg-foreground/[0.035] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-foreground/[0.06] dark:hover:bg-foreground/[0.05] dark:active:bg-foreground/[0.08]',
          prominent ? 'rounded-lg' : 'rounded-md',
        )}
      />
      <div className="pointer-events-none relative min-w-0 flex-1">
        <motion.span
          ref={shortRef}
          layoutId={`${link.code}:short`}
          className={cn('block w-fit max-w-full origin-left truncate font-semibold', prominent ? 'text-base leading-6' : 'text-sm leading-5')}
        >
          {displayUrl(link.shortUrl)}
        </motion.span>
        <motion.p
          layoutId={`${link.code}:url`}
          layout="position"
          className="truncate text-xs leading-4 text-muted-foreground"
        >
          {displayUrl(link.url)}
        </motion.p>
      </div>
      {!prominent && (
        <motion.div layoutId={`${link.code}:open`} layout="position" className="relative">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${link.shortUrl} in a new tab`}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-100 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:bg-border dark:hover:bg-accent/50 dark:active:bg-accent"
          >
            <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4" />
          </a>
        </motion.div>
      )}
    </>
  )
}
