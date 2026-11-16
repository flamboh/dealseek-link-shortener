import { AnimatePresence, motion } from 'motion/react'
import { useToast } from '../lib/toast'
import { linkTransition } from './motion'

export function Toaster() {
  const toast = useToast()

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <AnimatePresence initial={false}>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: linkTransition.ease }}
            className="flex max-w-full items-center gap-3 rounded-lg border border-border bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-lg"
          >
            {toast.image && <img src={toast.image} alt="" className="size-16 shrink-0 rounded-sm" />}
            <span className="min-w-0 truncate">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
