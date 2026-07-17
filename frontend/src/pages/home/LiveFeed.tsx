import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { api } from '@/lib/api'

interface ActivityEvent {
  type: 'meet_created' | 'meet_joined' | 'message'
  createdAt: string
  user: { id: number; username: string; name: string }
  meet?: { id: number; title: string }
  excerpt?: string
}

interface Row {
  key: string
  initials: string
  tone: 'a' | 'b' | 'c'
  name: string
  action: string
  /* carries its own leading space, or a leading colon for message rows */
  rest: string
  createdAt: string
}

const TONES = ['a', 'b', 'c'] as const

/** "Lena K." -> "LK"; single names -> first two letters. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function buildRow(ev: ActivityEvent): Row {
  const name = ev.user.name
  const tone = TONES[ev.user.id % 3]
  let action = ''
  let rest: string
  if (ev.type === 'meet_joined') {
    action = 'joined'
    rest = ` ${ev.meet?.title ?? 'a meet'}`
  } else if (ev.type === 'meet_created') {
    action = 'created'
    rest = ` ${ev.meet?.title ?? 'a meet'}`
  } else {
    rest = `: “${ev.excerpt ?? ''}”`
  }
  const key = `${ev.type}|${ev.createdAt}|${ev.user.id}|${ev.meet?.id ?? ''}|${ev.excerpt ?? ''}`
  return { key, initials: initialsOf(name), tone, name, action, rest, createdAt: ev.createdAt }
}

/** "just now" / "6 min ago" / "2 h ago" / "Yesterday" / "3 days ago". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const sec = Math.round((Date.now() - then) / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} h ago`
  const days = Math.round(hr / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function LiveFeed() {
  const [rows, setRows] = useState<Row[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const topKeyRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await api<{ data: ActivityEvent[] }>('/api/activity')
        if (active) setRows(res.data.slice(0, 7).map(buildRow))
      } catch {
        // Keep the last good stream on a transient failure.
      }
    }
    void load()
    const timer = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  // Slide the newest row in, but only for a genuinely new top entry: never on
  // first hydration, never when a poll returns the same head, never under
  // reduced motion.
  const topKey = rows[0]?.key ?? null
  useEffect(() => {
    if (topKey === null) return
    const prev = topKeyRef.current
    topKeyRef.current = topKey
    if (!hydratedRef.current) {
      hydratedRef.current = true
      return
    }
    if (prev === topKey) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const row = listRef.current?.firstElementChild
    if (row) gsap.from(row, { y: -18, autoAlpha: 0, duration: 0.5, ease: 'power2.out' })
  }, [topKey])

  return (
    <section id="feed" className="fm-feed">
      <div className="fm-feed-copy" data-reveal="">
        <span className="fm-kicker">Right now on FlightMeet</span>
        <h2 className="fm-feed-title">The lift is already crowded, in a good way.</h2>
        <p>
          Joins, photos and cloudbase reports drift in all day from meets across the country.
          Nothing shouts for attention, the stream just keeps moving, like a launch site on a
          good forecast.
        </p>
      </div>
      <div className="fm-feed-panel" data-reveal="">
        <div ref={listRef}>
          {rows.length === 0 ? (
            <div className="fm-feed-item">
              <div className="fm-feed-txt">
                It&rsquo;s calm right now. Perfect time to plan a meet.
              </div>
            </div>
          ) : (
            rows.map((e) => (
              <div key={e.key} className="fm-feed-item">
                <span className={`fm-feed-av fm-feed-av--${e.tone}`} aria-hidden="true">
                  {e.initials}
                </span>
                <div className="fm-feed-txt">
                  <b>{e.name}</b>
                  {e.action && (
                    <>
                      {' '}
                      <span className="fm-feed-act">{e.action}</span>
                    </>
                  )}
                  {e.rest}
                  <span className="fm-feed-when">{relativeTime(e.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
