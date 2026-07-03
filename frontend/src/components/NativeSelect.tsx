import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Schlicht gestyltes natives <select> im Look der shadcn-Inputs.
 * (Das Base-UI-Select braucht deutlich mehr Verdrahtung — für simple
 * Filter-Dropdowns reicht das native Element völlig.)
 */
export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-8 rounded-none border border-input bg-background px-2 text-xs outline-none',
        'transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
