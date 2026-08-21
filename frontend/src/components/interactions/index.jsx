/**
 * Interaction Slide Engine
 *
 * Dispatches to the correct interaction type component based on
 * the `interactionType` field in the lesson config.
 *
 * Usage in a slide JSON block:
 * {
 *   "type": "interaction",
 *   "content": {
 *     "interactionType": "A",   // "A" | "B" | "C" | "E"
 *     "lesson": { ...overrides } // optional — falls back to each type's default
 *   }
 * }
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X as XIcon, Sparkles } from 'lucide-react'
import { MathText } from './MathText'
import { TactileButton } from '../ui/tactile-button'

export { default as InteractionTypeA } from './InteractionTypeA'
export { default as InteractionTypeB } from './InteractionTypeB'
export { default as InteractionTypeC } from './InteractionTypeC'
export { default as InteractionTypeE } from './InteractionTypeE'
export { default as SandboxInteraction } from './SandboxInteraction'

import InteractionTypeA from './InteractionTypeA'
import InteractionTypeB from './InteractionTypeB'
import InteractionTypeC from './InteractionTypeC'
import InteractionTypeE from './InteractionTypeE'
import SandboxInteraction from './SandboxInteraction'

const TYPE_MAP = {
  'A': InteractionTypeA,
  'B': InteractionTypeB,
  'C': InteractionTypeC,
  'E': InteractionTypeE,
  'sandbox': SandboxInteraction,
  'SANDBOX': SandboxInteraction,
}

/* ═══════════════════════════════════════════════════════════════════════════
 * StatementPopup — Clean modal displaying the problem prompt.
 * Non-intrusive, styled with design system tokens.
 * ═══════════════════════════════════════════════════════════════════════════ */

function StatementPopup({ text, isSandbox }) {
  const [open, setOpen] = useState(!isSandbox) // Sandbox displays statement in its own header, modal is optional

  return (
    <>
      {/* Floating Reopen Button (placed cleanly in top-right without header overlap) */}
      {!open && !isSandbox && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Xem đề bài"
          className="absolute top-3.5 right-3.5 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 font-extrabold text-xs border border-indigo-200 active:translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>Đề bài</span>
        </button>
      )}

      {/* Modal Dialog */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-tight">Đề bài thực hành</h3>
                    <p className="text-xs text-slate-400 font-semibold">Tương tác trực quan</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Statement Text */}
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium space-y-2 max-h-60 overflow-y-auto">
                {text.split('\n').map((line, i) => (
                  <div key={i}>
                    {line.trim() ? <MathText text={line} /> : null}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <TactileButton
                  variant="primary"
                  size="md"
                  onClick={() => setOpen(false)}
                  className="w-full"
                >
                  <Sparkles className="w-4 h-4 mr-1.5 fill-white" />
                  <span>Bắt đầu thử nghiệm</span>
                </TactileButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * InteractionSlide — renders the correct engine for a given interactionType.
 */
export default function InteractionSlide({ interactionType, lesson, content }) {
  const resolvedType = interactionType || content?.interactionType || content?.interaction_type
  const resolvedLesson = lesson || content?.lesson || content?.manifest
  const normalizedType = String(resolvedType || '')
  const Component = TYPE_MAP[resolvedType]
    || TYPE_MAP[normalizedType.toUpperCase()]
    || TYPE_MAP[normalizedType.toLowerCase()]

  if (!Component) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-rose-600 font-bold text-sm bg-rose-50 border-2 border-rose-200 rounded-3xl">
        Không tìm thấy kiểu tương tác: <span className="ml-1.5 font-mono underline">{resolvedType || 'trống'}</span>
      </div>
    )
  }

  const isSandbox = String(resolvedType || '').toLowerCase() === 'sandbox'
  const prompt = resolvedLesson?.prompt

  return (
    <div className="w-full h-full relative flex flex-col flex-1">
      <Component lesson={resolvedLesson} />
      {prompt && !isSandbox && <StatementPopup text={prompt} isSandbox={isSandbox} />}
    </div>
  )
}
