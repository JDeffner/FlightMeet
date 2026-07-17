// Paraglider canopy arc from the "Cloudy Glass" logo concept. Colored via
// currentColor so each context (nav, footer) sets its own ink/cream.
export function Canopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 22" fill="none" aria-hidden="true">
      <path d="M5 20 Q30 0 55 20 Q30 10 5 20 Z" fill="currentColor" />
    </svg>
  )
}
