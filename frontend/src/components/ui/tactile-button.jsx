import React from 'react'
import { cn } from '../../lib/utils'
import soundFX from '../../lib/soundEffects'

/**
 * 2.5D Tactile Button Component (Zero-CLS Architecture)
 * Simulates physical button press using solid GPU-accelerated box-shadow depth and spring displacement.
 * Zero layout shifts: height and box-model remain identical between default, hover, and active states.
 */
export const TactileButton = React.forwardRef(({
  children,
  variant = 'primary', // 'primary' | 'cyan' | 'success' | 'amber' | 'danger' | 'secondary' | 'ghost'
  size = 'md',        // 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon'
  className,
  disabled = false,
  sound = true,
  onClick,
  as: Component = 'button',
  ...props
}, ref) => {
  const variantStyles = {
    primary: 'btn-tactile-primary',
    cyan: 'btn-tactile-cyan',
    success: 'btn-tactile-success',
    amber: 'btn-tactile-amber',
    danger: 'btn-tactile-danger',
    secondary: 'btn-tactile-secondary',
    ghost: 'btn-tactile-ghost'
  }

  const sizeStyles = {
    xs: 'h-8 px-3 text-xs rounded-xl font-extrabold gap-1',
    sm: 'h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm rounded-xl font-bold gap-1.5 min-h-[40px]',
    md: 'h-11 sm:h-12 px-5 sm:px-6 text-sm sm:text-base rounded-2xl font-bold gap-2 min-h-[44px]',
    lg: 'h-13 sm:h-14 px-6 sm:px-8 text-base sm:text-lg rounded-2xl font-extrabold gap-2.5 min-h-[48px]',
    'icon-xs': 'h-8 w-8 p-0 rounded-xl flex items-center justify-center',
    'icon-sm': 'h-10 w-10 p-0 rounded-xl flex items-center justify-center min-h-[40px]',
    icon: 'h-12 w-12 p-0 rounded-2xl flex items-center justify-center min-h-[48px]'
  }

  const handleClick = (e) => {
    if (disabled) return
    if (sound) {
      soundFX.click()
    }
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <Component
      ref={ref}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative inline-flex items-center justify-center font-sans tracking-wide select-none cursor-pointer whitespace-nowrap shrink-0',
        'disabled:opacity-50 disabled:pointer-events-none disabled:active:translate-y-0',
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
