import { useRef } from 'react'
import { motion } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import type { ShortLink } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { displayUrl, formatStats } from '../lib/format'
import { useLinkStats } from '../lib/link-store'
import { showToast } from '../lib/toast'
import { cn } from '../lib/utils'
import { RevokeControls } from './RevokeControls'

type LinkSummaryProps = {
  link: ShortLink
  prominent?: boolean
}

export function LinkSummary({ link, prominent = false }: LinkSummaryProps) {
  const shortRef = useRef<HTMLSpanElement>(null)
  const stats = useLinkStats(link.code)

  const copy = async () => {
    if (await copyText(link.shortUrl)) {
      showToast(`Copied ${displayUrl(link.shortUrl)}`)
      return
    }
    if (shortRef.current) window.getSelection()?.selectAllChildren(shortRef.current)
    showToast('Couldn’t copy. Select the link and copy it manually.')
  }

  const openLink = !prominent && (
    <a
      href={link.shortUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${link.shortUrl} in a new tab`}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-100 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:bg-border dark:hover:bg-accent/50 dark:active:bg-accent"
    >
      <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4" />
    </a>
  )

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
        {link.ownerToken && (
          <motion.p
            layoutId={`${link.code}:stats`}
            layout="position"
            className="mt-0.5 text-xs leading-4 text-muted-foreground/80 tabular-nums"
          >
            {stats ? formatStats(stats) : '\u00a0'}
          </motion.p>
        )}
      </div>
      {(link.ownerToken || !prominent) && (
        <motion.div layoutId={`${link.code}:actions`} layout="position" className="relative flex items-center gap-0.5">
          {link.ownerToken ? <RevokeControls link={link}>{openLink}</RevokeControls> : openLink}
        </motion.div>
      )}
    </>
  )
}
