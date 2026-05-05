import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'default'
  className?: string
}

const variants = {
  info: 'bg-indigo-100 text-indigo-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  default: 'bg-slate-100 text-slate-700',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`
      inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
      ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  )
}