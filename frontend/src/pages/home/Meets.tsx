import { useEffect, useRef, useState } from 'react'
import heroImg from '@/assets/hero-paraglider.png'

const MEETS = [
  {
    title: 'Sunset Session at Kandel',
    site: 'Kandel West Launch',
    region: 'Black Forest',
    when: 'Sat, Jul 11 · 5:30 PM',
    level: 'Advanced',
    max: 10,
  },
  {
    title: 'Thermal Day at Brauneck',
    site: 'Brauneck North',
    region: 'Bavarian Alps',
    when: 'Sun, Jul 12 · 10:00 AM',
    level: 'All levels',
    max: 12,
  },
  {
    title: 'After-Work Soaring, Mosel',
    site: 'Zeltingen Ridge',
    region: 'Mosel Valley',
    when: 'Wed, Jul 15 · 6:00 PM',
    level: 'Beginner',
    max: 8,
  },
]

export function Meets() {
  const [joined, setJoined] = useState<boolean[]>([false, false, false])
  const [counts, setCounts] = useState<number[]>([6, 12, 4])
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }

  const toggleJoin = (i: number) => {
    const meet = MEETS[i]
    if (joined[i]) {
      setJoined(joined.map((j, k) => (k === i ? false : j)))
      setCounts(counts.map((c, k) => (k === i ? c - 1 : c)))
      showToast(`You left "${meet.title}".`)
    } else {
      if (counts[i] >= meet.max) return
      setJoined(joined.map((j, k) => (k === i ? true : j)))
      setCounts(counts.map((c, k) => (k === i ? c + 1 : c)))
      showToast(`You're in! See you at ${meet.site}.`)
    }
  }

  return (
    <section id="meets" className="fm-meets">
      <div id="meets-panel" className="fm-meets-panel">
        <img id="meets-bg" className="fm-meets-bg" src={heroImg} alt="" aria-hidden="true" />
        <div className="fm-meets-overlay" />

        <div className="fm-meets-inner">
          <div className="fm-meets-head" data-reveal="">
            <div className="fm-meets-head-copy">
              <span className="fm-kicker fm-kicker--light">Coming up</span>
              <h2 className="fm-h2 fm-h2--light">Upcoming meets</h2>
            </div>
            <a href="#meets" className="fm-allmeets-btn">
              <span>All meets</span>
              <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
            </a>
          </div>

          <div className="fm-meets-grid">
            {MEETS.map((meet, i) => {
              const full = counts[i] >= meet.max
              const isJoined = joined[i]
              const status = isJoined ? 'Joined' : full ? 'Full' : 'Open'
              const statusClass = isJoined ? 'joined' : full ? 'full' : 'open'
              return (
                <div key={meet.title} className="fm-card" data-card="">
                  <div className="fm-card-top">
                    <span className={`fm-card-status fm-card-status--${statusClass}`}>{status}</span>
                    <span className="fm-card-spots">{counts[i]} / {meet.max} spots</span>
                  </div>
                  <h3 className="fm-card-title">{meet.title}</h3>
                  <div className="fm-card-rows">
                    <div className="fm-card-row"><span>Site</span><span>{meet.site}</span></div>
                    <div className="fm-card-row"><span>Region</span><span>{meet.region}</span></div>
                    <div className="fm-card-row"><span>When</span><span>{meet.when}</span></div>
                    <div className="fm-card-row"><span>Level</span><span>{meet.level}</span></div>
                  </div>
                  {isJoined || !full ? (
                    <button
                      className={`fm-card-btn ${isJoined ? 'fm-card-btn--joined' : 'fm-card-btn--join'}`}
                      onClick={() => toggleJoin(i)}
                    >
                      {isJoined ? 'Joined ✓ — Cancel' : 'Join meet'}
                    </button>
                  ) : (
                    <button
                      className="fm-card-btn fm-card-btn--host"
                      onClick={() => showToast(`Message sent to the host of "${meet.title}".`)}
                    >
                      Message host
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {toast && <div className="fm-toast">{toast}</div>}
        </div>
      </div>
    </section>
  )
}
