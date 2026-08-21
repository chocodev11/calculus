import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function Slide({ id, title, subtitle, children, className }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      data-slide-id={id}
      className={cn('w-full max-w-3xl mx-auto space-y-6', className)}
    >
      {title && (
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-black">
        {children}
      </div>
    </motion.section>
  )
}

export default Slide
