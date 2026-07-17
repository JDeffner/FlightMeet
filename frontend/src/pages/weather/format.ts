// Small formatting helpers for report freshness.

/** Whole hours since an ISO timestamp (never below 1, for "N hours old" copy). */
export function hoursSince(iso: string): number {
  const diffMs = Date.now() - Date.parse(iso)
  return Math.max(1, Math.round(diffMs / 3_600_000))
}

/** Warm relative time, e.g. "just now", "5 minutes ago", "3 hours ago". */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso)
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
