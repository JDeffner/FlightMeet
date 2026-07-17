import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPinIcon } from '@phosphor-icons/react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { MeetDetail, MeetSummary } from '@/lib/types'
import heroImg from '@/assets/ridge-dusk.png'

// The API hands us "YYYY-MM-DD" + "HH:MM"; stitch them into a real Date so we
// can filter to the future and sort by soonest launch.
function meetDate(meet: MeetSummary): Date {
  return new Date(`${meet.date}T${meet.time || '00:00'}`)
}

const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' })
const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export function Meets() {
  const { user } = useAuth()
  const navigate = useNavigate()
  // null = still loading (renders skeleton cards), [] = no upcoming meets.
  const [meets, setMeets] = useState<MeetSummary[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    let active = true
    api<{ data: MeetSummary[] }>('/api/meets')
      .then((res) => {
        if (!active) return
        const now = Date.now()
        const upcoming = res.data
          .filter((m) => meetDate(m).getTime() >= now)
          .sort((a, b) => meetDate(a).getTime() - meetDate(b).getTime())
          .slice(0, 3)
        setMeets(upcoming)
      })
      .catch(() => {
        // A hard error shouldn't shout on the landing page; fall back to the
        // "plan the first meet" invite so the section still feels alive.
        if (active) setMeets([])
      })
    return () => {
      active = false
    }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }

  async function toggleJoin(meet: MeetSummary) {
    if (!user) {
      navigate('/login')
      return
    }
    const leaving = meet.joined
    setBusyId(meet.id)
    try {
      const res = await api<{ meet: MeetDetail }>(`/api/meets/${meet.id}/join`, {
        method: leaving ? 'DELETE' : 'POST',
      })
      const u = res.meet
      setMeets((prev) =>
        prev
          ? prev.map((m) =>
              m.id === u.id
                ? {
                    ...m,
                    participantCount: u.participantCount,
                    maxParticipants: u.maxParticipants,
                    status: u.status,
                    joined: u.joined,
                  }
                : m,
            )
          : prev,
      )
      showToast(leaving ? `You left "${meet.title}".` : `You're in! See you at ${meet.spot}.`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast(err.message)
      } else if (err instanceof ApiError && err.status === 401) {
        navigate('/login')
      } else {
        showToast('Something went wrong. Please try again.')
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section id="meets" className="fm-meets">
      <div id="meets-panel" className="fm-meets-panel">
        <img id="meets-bg" className="fm-meets-bg" src={heroImg} alt="" aria-hidden="true" />

        <div className="fm-meets-inner">
          <div className="fm-meets-head" data-reveal="">
            <div className="fm-meets-head-copy">
              <span className="fm-kicker fm-kicker--ink">Step 01 · Find</span>
              <h2 className="fm-h2">Upcoming meets</h2>
            </div>
            <Link to="/meets" className="fm-allmeets-btn" data-magnet="">
              <span>All meets</span>
              <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
            </Link>
          </div>

          {/*
            Cards keep the same root <div className="fm-card" data-card> across
            loading -> loaded, keyed by index, so React reuses the same DOM nodes.
            That matters because HomePage's ScrollTrigger entrance (targets
            [data-card], once:true) captures these nodes at mount while they are
            still skeletons; reusing them lets the real cards inherit the rise-in.
          */}
          <div className="fm-meets-grid">
            {meets === null ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="fm-card fm-card--skel" data-card="" aria-hidden="true">
                  <div className="fm-card-top">
                    <span className="fm-skel" style={{ width: 120, height: 15 }} />
                    <span className="fm-skel" style={{ width: 64, height: 24, borderRadius: 999 }} />
                  </div>
                  <span className="fm-skel" style={{ width: '82%', height: 24 }} />
                  <span className="fm-skel" style={{ width: '58%', height: 15 }} />
                  <div className="fm-card-foot">
                    <span className="fm-skel" style={{ width: 88, height: 24, borderRadius: 999 }} />
                    <span className="fm-skel" style={{ width: 120, height: 10 }} />
                  </div>
                  <span className="fm-skel" style={{ width: '100%', height: 48, borderRadius: 999 }} />
                </div>
              ))
            ) : meets.length === 0 ? (
              <div key={0} className="fm-card fm-card--empty" data-card="">
                <span className="fm-card-day">The sky is open</span>
                <h3 className="fm-card-title">No meets on the horizon yet</h3>
                <p className="fm-card-where fm-card-where--empty">
                  Pick a launch, name a time, and your crew will find you.
                </p>
                <Link to="/meets/new" className="fm-card-btn fm-card-btn--join">
                  Plan the first meet
                </Link>
              </div>
            ) : (
              meets.map((meet, i) => {
                const d = meetDate(meet)
                const isJoined = meet.joined
                const full = meet.status === 'full'
                const status = isJoined ? 'Joined' : full ? 'Full' : 'Open'
                const statusClass = isJoined ? 'joined' : full ? 'full' : 'open'
                const pct = meet.maxParticipants
                  ? Math.round((meet.participantCount / meet.maxParticipants) * 100)
                  : 0
                return (
                  <div key={i} className="fm-card" data-card="">
                    <div className="fm-card-top">
                      <div className="fm-card-when">
                        <span className="fm-card-day">{fmtDay(d)}</span>
                        <span className="fm-card-date">
                          {fmtDate(d)} · {fmtTime(d)}
                        </span>
                      </div>
                      <span className={`fm-card-status fm-card-status--${statusClass}`}>{status}</span>
                    </div>

                    <Link to={`/meets/${meet.id}`} className="fm-card-title">
                      {meet.title}
                    </Link>
                    <p className="fm-card-where">
                      <MapPinIcon size={16} weight="duotone" aria-hidden="true" />
                      {meet.spot} · {meet.region}
                    </p>

                    <div className="fm-card-foot">
                      <span className="fm-card-level">{meet.level}</span>
                      <div
                        className="fm-card-cap"
                        role="meter"
                        aria-label={`${meet.participantCount} of ${meet.maxParticipants} spots taken`}
                        aria-valuemin={0}
                        aria-valuemax={meet.maxParticipants}
                        aria-valuenow={meet.participantCount}
                      >
                        <span className="fm-cap-track">
                          <span
                            className={`fm-cap-fill${full ? ' fm-cap-fill--full' : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="fm-cap-label">
                          {meet.participantCount}/{meet.maxParticipants}
                        </span>
                      </div>
                    </div>

                    {isJoined || !full ? (
                      <button
                        className={`fm-card-btn ${isJoined ? 'fm-card-btn--joined' : 'fm-card-btn--join'}`}
                        onClick={() => toggleJoin(meet)}
                        disabled={busyId === meet.id}
                      >
                        {isJoined ? 'Joined ✓ · Cancel' : 'Join meet'}
                      </button>
                    ) : (
                      <Link to={`/meets/${meet.id}`} className="fm-card-btn fm-card-btn--host">
                        View meet
                      </Link>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {toast && <div className="fm-toast">{toast}</div>}
        </div>
      </div>
    </section>
  )
}
