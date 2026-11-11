import { motion } from 'motion/react'
import type { ShortLink } from '../lib/api'
import { LinkSummary } from './LinkSummary'
import { linkTransition } from './motion'

export function ShortLinkResult({ link }: { link: ShortLink }) {
  return (
    <motion.div
      layoutId={link.code}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ default: { duration: 0.25, ease: linkTransition.ease, delay: 0.12 }, layout: linkTransition }}
      className="relative flex items-center gap-3 rounded-lg py-2.5 pr-2 pl-3"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-lg border border-input bg-card shadow-xs dark:bg-input/30"
      />
      <LinkSummary link={link} prominent />
    </motion.div>
  )
}
