import React, { useState, createContext, useContext } from 'react'
import { Check, X, HelpCircle, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'
import { TactileButton } from '../ui/tactile-button'
import { motion, AnimatePresence } from 'framer-motion'
import soundFX from '../../lib/soundEffects'
import { fireConfetti } from '../../lib/confetti'

const QuizContext = createContext(null)

export function Quiz({
  question,
  explanation,
  allowRetry = true,
  children
}) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [options, setOptions] = useState({})
  const [showExplanation, setShowExplanation] = useState(false)

  const registerOption = (value, correct, exp) => {
    setOptions(prev => ({
      ...prev,
      [value]: { correct, explanation: exp }
    }))
  }

  const isCorrect = selectedOption && options[selectedOption]?.correct

  const handleSubmit = () => {
    if (!selectedOption) return
    setIsSubmitted(true)
    setShowExplanation(true)
    if (options[selectedOption]?.correct) {
      soundFX.success()
      fireConfetti({ particleCount: 30, origin: { x: 0.5, y: 0.7 } })
    } else {
      soundFX.error()
    }
  }

  const handleRetry = () => {
    soundFX.click()
    setIsSubmitted(false)
    setSelectedOption(null)
    setShowExplanation(false)
  }

  return (
    <QuizContext.Provider value={{ selectedOption, setSelectedOption, isSubmitted, isCorrect, registerOption }}>
      <div className="my-6 p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Câu hỏi kiểm tra nhanh</span>
        </div>

        <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 mb-4 leading-snug">
          {question}
        </h3>

        <div className="space-y-3 mb-5">
          {children}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          {!isSubmitted ? (
            <TactileButton
              variant="primary"
              size="md"
              disabled={!selectedOption}
              onClick={handleSubmit}
              className="w-full sm:w-auto"
            >
              Kiểm tra đáp án
            </TactileButton>
          ) : (
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <span className="inline-flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                    <Check className="w-5 h-5 stroke-[3]" /> Chính xác!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                    <X className="w-5 h-5 stroke-[3]" /> Chưa chính xác
                  </span>
                )}
              </div>

              {allowRetry && !isCorrect && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-xs sm:text-sm font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline underline-offset-4 cursor-pointer"
                >
                  Thử lại
                </button>
              )}
            </div>
          )}
        </div>

        {/* Explanation Alert */}
        <AnimatePresence>
          {showExplanation && (explanation || options[selectedOption]?.explanation) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                'mt-4 p-4 rounded-2xl border-2 text-xs sm:text-sm leading-relaxed overflow-hidden',
                isCorrect
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
              )}
            >
              <div className="font-black mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>Giải thích chi tiết:</span>
              </div>
              <p>{options[selectedOption]?.explanation || explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </QuizContext.Provider>
  )
}

export function Option({ value, correct = false, explanation = '', children }) {
  const context = useContext(QuizContext)
  if (!context) {
    throw new Error('Option must be used inside a Quiz component')
  }

  const { selectedOption, setSelectedOption, isSubmitted, isCorrect, registerOption } = context

  React.useEffect(() => {
    registerOption(value, correct, explanation)
  }, [value, correct, explanation])

  const isSelected = selectedOption === value
  const isCorrectChoice = correct

  let styleState = 'default'
  if (isSubmitted) {
    if (isSelected && isCorrect) styleState = 'correct'
    else if (isSelected && !isCorrect) styleState = 'incorrect'
    else if (isCorrectChoice) styleState = 'revealed-correct'
  } else if (isSelected) {
    styleState = 'selected'
  }

  const stateStyles = {
    default: 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600',
    selected: 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-sm',
    correct: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100',
    incorrect: 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-100',
    'revealed-correct': 'bg-emerald-50/40 dark:bg-emerald-950/30 border-dashed border-emerald-400 text-emerald-800 dark:text-emerald-300',
  }

  const handleClick = () => {
    if (isSubmitted) return
    soundFX.pop()
    setSelectedOption(value)
  }

  return (
    <button
      type="button"
      disabled={isSubmitted}
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-colors duration-150 flex items-center justify-between gap-3 select-none cursor-pointer disabled:cursor-default min-h-[52px]',
        stateStyles[styleState]
      )}
    >
      <div className="flex items-center gap-3 font-semibold text-sm sm:text-base">
        <span className={cn(
          'w-7 h-7 rounded-xl border-2 flex items-center justify-center font-bold text-xs shrink-0 transition-colors',
          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
        )}>
          {value}
        </span>
        <span>{children}</span>
      </div>

      {isSubmitted && isSelected && (
        <span className="shrink-0">
          {isCorrect ? (
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
          ) : (
            <X className="w-5 h-5 text-rose-600 dark:text-rose-400 stroke-[3]" />
          )}
        </span>
      )}
    </button>
  )
}

export default Quiz
