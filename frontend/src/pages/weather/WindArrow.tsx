// A small arrow that points the way the wind is blowing toward. Reused in the
// current-conditions block and each forecast day card.
import { ArrowUpIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { compassPoint, windFlowRotation } from './wind'

export function WindArrow({
  direction,
  className,
}: {
  direction: number
  className?: string
}) {
  return (
    <ArrowUpIcon
      weight="bold"
      className={cn('shrink-0', className)}
      style={{ transform: `rotate(${windFlowRotation(direction)}deg)` }}
    >
      <title>{`Wind from ${compassPoint(direction)}`}</title>
    </ArrowUpIcon>
  )
}
