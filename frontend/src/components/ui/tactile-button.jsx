import React from 'react'
import { cn } from '../../lib/utils'

/**
 * 2.5D Tactile Button Component
 * Simulates physical button press with a bottom border bevel.
 */
export const TactileButton = React.forwardRef(({
  children,
  variant = 'primary', // 'primary' | 'cyan' | 'success' | 'amber' | 'danger' | 'secondary' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg' | 'icon'
  className,
  disabled = false,
  as: Component = 'button',
  ...props
}, ref) => {
  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-b-4 border-indigo-800 active:border-b-0 shadow-sm',
    cyan: 'bg-sky-500 hover:bg-sky-400 text-white border-b-4 border-sky-700 active:border-b-0 shadow-sm',
    success: 'bg-emerald-500 hover:bg-emerald-400 text-white border-b-4 border-emerald-700 active:border-b-0 shadow-sm',
    amber: 'bg-amber-500 hover:bg-amber-400 text-white border-b-4 border-amber-700 active:border-b-0 shadow-sm',
    danger: 'bg-rose-500 hover:bg-rose-400 text-white border-b-4 border-rose-700 active:border-b-0 shadow-sm',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 border-b-4 border-b-slate-300 active:border-b-2 shadow-sm',
    ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-0 active:translate-y-0 shadow-none'
  }

  const sizeStyles = {
    sm: 'h-9 px-3.5 text-xs rounded-xl font-bold gap-1.5',
    md: 'h-12 px-6 text-sm rounded-2xl font-bold gap-2',
    lg: 'h-14 px-8 text-base rounded-2xl font-extrabold gap-2.5',
    icon: 'h-10 w-10 p-0 rounded-xl flex items-center justify-center'
  }

  return (
    <Component
      ref={ref}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center justify-center font-sans tracking-wide select-none cursor-pointer whitespace-nowrap shrink-0',
        'transition-all duration-100 ease-out active:translate-y-1',
        'disabled:opacity-50 disabled:pointer-events-none disabled:active:translate-y-0 disabled:active:border-b-4',
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
})

TactileButton.displayName = 'TactileButton'
export default TactileButton
