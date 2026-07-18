// Small shared components for the meets pages (FR-3…FR-19).
// (Non-component helpers live in format.ts so fast refresh keeps working.)
import { CheckCircleIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import type { Level, MeetSummary } from '@/lib/types'
import { cn } from '@/lib/utils'

export function LevelBadge({ level }: { level: Level }) {
  return <Badge variant="outline">{level}</Badge>
}

export function StatusBadge({ status }: { status: MeetSummary['status'] }) {
  return status === 'full' ? (
    <Badge variant="destructive">Full</Badge>
  ) : (
    <Badge variant="secondary">Open</Badge>
  )
}

export function JoinedBadge() {
  return (
    <Badge>
      <CheckCircleIcon weight="fill" data-icon="inline-start" />
      Joined
    </Badge>
  )
}

/**
 * Slim participant capacity bar: a muted track with a primary fill that turns a
 * warm red when the meet is full. Shared by the meet card and the detail page.
 */
export function CapacityBar({
  count,
  max,
  className,
}: {
  count: number
  max: number
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0
  const full = count >= max
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={count}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${count} of ${max} pilots`}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300',
          full ? 'bg-destructive' : 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
