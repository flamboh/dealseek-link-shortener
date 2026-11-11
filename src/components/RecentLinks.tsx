import { motion } from 'motion/react'
import type { ShortLink } from '../lib/api'
import { LinkSummary } from './LinkSummary'

type RecentLinksProps = {
  links: ShortLink[]
  arrivingCode: string | null
}

export function RecentLinks({ links, arrivingCode }: RecentLinksProps) {
  return (
    <section aria-labelledby="recent-label">
      <motion.h2
        id="recent-label"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-3 text-xs font-medium text-muted-foreground"
      >
        Recent
      </motion.h2>
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 border-t border-border"
      />
      <ul>
        {links.map((link) => (
          <motion.li key={link.code} layoutId={link.code} className="relative flex items-center gap-3 border-b border-border py-2 pr-2 pl-3">
            {link.code === arrivingCode && (
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeIn' }}
                className="absolute inset-x-0 top-0 -bottom-px rounded-lg border border-input bg-card shadow-xs dark:bg-input/30"
              />
            )}
            <LinkSummary link={link} />
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
