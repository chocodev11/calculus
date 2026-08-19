import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MathText } from '../interactions/MathText'
import { cn } from '../../lib/utils'

/**
 * TactileSelect - 2.5D tactile custom dropdown selector with KaTeX math rendering.
 * 
 * Props:
 * - value: string | number (current selected value)
 * - onChange: (value: string | number) => void
 * - options: Array<string | number | { value: string | number, label: string }>
 * - optionLabels: Record<string, string> (optional mapping of value -> custom label)
 * - placeholder: string (default placeholder text)
 * - label: string (optional field title)
 * - disabled: boolean
 * - className: string
 */
export function TactileSelect({
  value,
  onChange,
  options = [],
  optionLabels = {},
  placeholder = '— Chọn đáp án —',
  label,
  disabled = false,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const listRef = useRef(null)

  // Normalize options array into { value, label }
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (opt !== null && typeof opt === 'object' && 'value' in opt) {
        return {
          value: opt.value,
          label: String(opt.label ?? optionLabels[String(opt.value)] ?? opt.value),
        }
      }
      const strVal = String(opt)
      const displayLabel = optionLabels[strVal] ?? (strVal === '' ? placeholder : strVal)
      return {
        value: opt,
        label: displayLabel,
      }
    })
  }, [options, optionLabels, placeholder])

  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value))
  const displayLabel = selectedOption ? selectedOption.label : placeholder
  const isSelected = value !== undefined && value !== null && value !== ''

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      if (!isOpen) {
        e.preventDefault()
        setIsOpen(true)
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault()
        setIsOpen(false)
      }
    }
  }, [disabled, isOpen])

  const handleSelect = (optValue) => {
    onChange?.(optValue)
    setIsOpen(false)
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full text-left font-sans select-none', className)}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label className="block text-xs sm:text-sm font-extrabold text-slate-800 leading-snug mb-1.5">
          <MathText text={label} />
        </label>
      )}

      {/* Tactile Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[46px] py-2.5 px-3.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-all duration-150',
          'border-2 bg-slate-50 hover:bg-white focus:bg-white outline-none cursor-pointer',
          isOpen
            ? 'border-indigo-600 ring-4 ring-indigo-100 shadow-sm bg-white'
            : isSelected
            ? 'border-indigo-200 hover:border-indigo-400 bg-white shadow-[0_2px_0_0_#E2E8F0] active:translate-y-0.5 active:shadow-none'
            : 'border-slate-200 hover:border-slate-300 shadow-[0_2px_0_0_#E2E8F0] active:translate-y-0.5 active:shadow-none',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100'
        )}
      >
        <span
          className={cn(
            'text-xs sm:text-sm truncate flex-1 leading-snug',
            isSelected ? 'font-bold text-slate-900' : 'font-semibold text-slate-400'
          )}
        >
          <MathText text={displayLabel} />
        </span>

        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'
          )}
        />
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            ref={listRef}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-1.5 max-h-60 overflow-y-auto space-y-1"
          >
            {normalizedOptions.map((opt, index) => {
              const active = String(opt.value) === String(value)
              const isPlaceholderOpt = opt.value === ''

              return (
                <button
                  key={`${opt.value}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer',
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isPlaceholderOpt
                      ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      : 'text-slate-800 hover:bg-slate-100 hover:text-indigo-600'
                  )}
                >
                  <span className="truncate flex-1">
                    <MathText text={opt.label} />
                  </span>

                  {active && (
                    <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TactileSelect
