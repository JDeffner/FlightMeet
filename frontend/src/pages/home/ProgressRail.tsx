import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'hero', label: 'Top' },
  { id: 'story', label: 'Why FlightMeet' },
  { id: 'steps', label: 'How it works' },
  { id: 'meets', label: 'Meets' },
  { id: 'feed', label: 'Live feed' },
  { id: 'features', label: 'Features' },
  { id: 'fly', label: 'Photo wall' },
  { id: 'pilots', label: 'Pilots' },
  { id: 'cta', label: 'Join' },
]

// Fixed dot rail on the left: shows where you are on the page, click to jump.
export function ProgressRail() {
  const [active, setActive] = useState('hero')

  useEffect(() => {
    // The section crossing the vertical middle of the viewport is the active one.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [])

  return (
    <nav className="fm-rail" aria-label="Page sections">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-label={s.label}
          aria-current={active === s.id ? 'true' : undefined}
          className={`fm-rail-dot${active === s.id ? ' fm-rail-dot--active' : ''}`}
        >
          <span className="fm-rail-label">{s.label}</span>
        </a>
      ))}
    </nav>
  )
}
