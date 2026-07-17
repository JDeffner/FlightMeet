import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Marker } from 'react-leaflet'
import { api } from '@/lib/api'
import type { MeetSummary } from '@/lib/types'
import { BaseMap } from '@/components/map/BaseMap'
import { brandMarkerIcon } from '@/components/map/markers'
import { weatherIcon } from '@/pages/weather/wmo'
import type {
  DailyForecast,
  Forecast,
  ReportsResponse,
  WeatherSearchResponse,
} from '@/pages/weather/types'
import skyImg from '@/assets/sky-gradient.png'

const ROSTER = ['LK', 'MO', 'JB', 'MT', 'SR', 'AN']

// Trier: the community's home town. Fixed centre + marker for the mini-map.
const TRIER: [number, number] = [49.7557, 6.6394]

/** Two-letter weekday for the compact forecast strip ("Fr", "Sa", …). */
function dayShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
}

/**
 * The most flyable of the first five days: the driest one whose max wind sits
 * in a comfortable 5–25 km/h band. Returns its index, or null if none qualify.
 */
function pickFlyable(daily: DailyForecast): number | null {
  let idx = -1
  let bestRain = Infinity
  const n = Math.min(5, daily.time.length)
  for (let i = 0; i < n; i++) {
    const wind = daily.wind_speed_10m_max[i]
    const rain = daily.precipitation_probability_max[i] ?? 100
    if (wind >= 5 && wind <= 25 && rain < bestRain) {
      bestRain = rain
      idx = i
    }
  }
  return idx >= 0 ? idx : null
}

function WeatherCard() {
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        // Prefer the shared community cache; searching Trier seeds it for
        // everyone if no report exists yet.
        const reports = await api<ReportsResponse>('/api/weather/reports')
        const trier = reports.data.find((r) => r.name.toLowerCase() === 'trier')
        if (trier) {
          if (active) setForecast(trier.forecast)
          return
        }
        const res = await api<WeatherSearchResponse>('/api/weather?city=Trier')
        if (active) setForecast(res.forecast)
      } catch {
        if (active) setFailed(true)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const daily = forecast?.daily
  const flyableIdx = daily ? pickFlyable(daily) : null
  const days = daily ? daily.time.slice(0, 5) : []
  const chipText =
    flyableIdx == null
      ? 'No flyable day in sight'
      : flyableIdx === 0
        ? 'Today looks flyable'
        : `${dayShort(days[flyableIdx])} looks flyable`

  return (
    <div className="fm-feat fm-feat--weather" data-feat="">
      <img className="fm-feat-bg" src={skyImg} alt="" aria-hidden="true" loading="lazy" />
      <div className="fm-feat-cloud">
        <span className="fm-feat-eyebrow">Weather built in</span>
        <h3>Know before you go</h3>
        <p>
          Every meet carries a forecast for its exact launch site. Judge the day before you
          drive, not on the hill.
        </p>

        {daily ? (
          <>
            <div className="fm-forecast">
              {days.map((date, i) => (
                <span
                  key={date}
                  className={`fm-forecast-day${i === flyableIdx ? ' fm-forecast-day--active' : ''}`}
                >
                  <span className="fm-forecast-name">{dayShort(date)}</span>
                  <span className="fm-forecast-icon">{weatherIcon(daily.weather_code[i])}</span>
                  <span className="fm-forecast-wind">
                    {Math.round(daily.wind_speed_10m_max[i])} km/h
                  </span>
                </span>
              ))}
              <span className={`fm-chip${flyableIdx == null ? '' : ' fm-chip--go'}`}>{chipText}</span>
            </div>

            <div className="fm-weather-map">
              <BaseMap
                center={TRIER}
                zoom={10}
                scrollWheelZoom={false}
                style={{ height: '9rem' }}
                ariaLabel="Weather map near Trier"
              >
                <Marker position={TRIER} icon={brandMarkerIcon()} />
              </BaseMap>
              <span className="fm-weather-map-label">Trier</span>
            </div>
          </>
        ) : failed ? (
          <p className="fm-weather-note">
            The Trier forecast is catching its breath. The full weather page has the live map.
          </p>
        ) : (
          <div className="fm-forecast" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="fm-forecast-day">
                <span className="fm-skel" style={{ width: 20, height: 11 }} />
                <span className="fm-skel" style={{ width: 22, height: 16 }} />
                <span className="fm-skel" style={{ width: 40, height: 11 }} />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** "Jul 11" for a meet suggestion row. */
function suggestionDate(meet: MeetSummary): string {
  return new Date(`${meet.date}T${meet.time || '00:00'}`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function FindCard() {
  const navigate = useNavigate()
  const [meets, setMeets] = useState<MeetSummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  // One fetch powers both the region chips and the search suggestions.
  useEffect(() => {
    let alive = true
    api<{ data: MeetSummary[] }>('/api/meets')
      .then((res) => {
        if (alive) setMeets(res.data)
      })
      .catch(() => {
        if (alive) setMeets([])
      })
    return () => {
      alive = false
    }
  }, [])

  const q = query.trim().toLowerCase()
  const suggestions =
    q && meets
      ? meets
          .filter((m) => [m.title, m.spot, m.region].some((t) => t.toLowerCase().includes(q)))
          .slice(0, 5)
      : []
  const showDrop = open && suggestions.length > 0

  // Regions that actually exist in the data (chips matching nothing are hidden).
  const regions = meets ? [...new Set(meets.map((m) => m.region))].slice(0, 4) : []

  function go(meet: MeetSummary) {
    navigate(`/meets/${meet.id}`)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (active >= 0 && suggestions[active]) {
        e.preventDefault()
        go(suggestions[active])
      } else if (query.trim()) {
        e.preventDefault()
        navigate(`/meets?q=${encodeURIComponent(query.trim())}`)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div className="fm-feat fm-feat--find" data-feat="">
      <span className="fm-feat-eyebrow">Made for your region</span>
      <h3>Find meets near you</h3>
      <p>
        Search by site, region, and skill level, from after-work soaring to full thermal days.
        Or create your own meet in a minute.
      </p>
      <div className="fm-search-demo">
        <div className="fm-search">
          <div className="fm-search-bar">
            <MagnifyingGlassIcon size={17} weight="bold" />
            <input
              className="fm-search-input"
              type="text"
              value={query}
              placeholder="Brauneck, thermal days…"
              aria-label="Search meets"
              role="combobox"
              aria-expanded={showDrop}
              aria-controls="fm-search-list"
              aria-autocomplete="list"
              aria-activedescendant={showDrop && active >= 0 ? `fm-sugg-${active}` : undefined}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(-1)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={onKeyDown}
            />
          </div>
          {showDrop && (
            <ul className="fm-search-drop" id="fm-search-list" role="listbox">
              {suggestions.map((m, i) => (
                <li
                  key={m.id}
                  id={`fm-sugg-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`fm-search-opt${i === active ? ' is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(m)}
                >
                  <span className="fm-search-opt-title">{m.title}</span>
                  <span className="fm-search-opt-meta">
                    {m.spot} · {m.region} · {suggestionDate(m)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="fm-chips">
          {regions.map((r) => (
            <Link key={r} to={`/meets?region=${encodeURIComponent(r)}`} className="fm-chip">
              {r}
            </Link>
          ))}
          <Link to="/meets/new" className="fm-chip">
            + your home site
          </Link>
        </div>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="fm-features">
      <div className="fm-section-head" data-reveal="">
        <span className="fm-kicker">Step 02 · Plan</span>
        <h2 className="fm-h2">Everything between forecast and takeoff</h2>
      </div>

      <div className="fm-feat-grid">
        <WeatherCard />

        <div className="fm-feat fm-feat--chat" data-feat="">
          <span className="fm-feat-eyebrow">One chat per meet</span>
          <h3>Plan it with the people going</h3>
          <p>Every meet has its own chat. No group-chat archaeology, no missed plans.</p>
          <div className="fm-bubbles">
            <div className="fm-bubble-row" data-bubble="">
              <span className="fm-bubble-avatar" aria-hidden="true">J</span>
              <div className="fm-bubble-stack">
                <span className="fm-bubble-name">Jonas</span>
                <div className="fm-bubble">West launch at 5? Wind turns SW after four.</div>
              </div>
            </div>
            <div className="fm-bubble-row fm-bubble-row--me" data-bubble="">
              <div className="fm-bubble fm-bubble--me">I&rsquo;m in. Bringing the wind flags.</div>
            </div>
            <div className="fm-bubble-row" data-bubble="">
              <span className="fm-bubble-avatar fm-bubble-avatar--2" aria-hidden="true">M</span>
              <div className="fm-bubble-stack">
                <span className="fm-bubble-name">Mara</span>
                <div className="fm-bubble">Saved you a spot on the hill.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="fm-feat fm-feat--join" data-feat="">
          <span className="fm-feat-eyebrow">Honest status</span>
          <h3>Join in a tap</h3>
          <p>
            Spots are counted from the roster, never estimated. If it says open, it&rsquo;s open. If
            it&rsquo;s full, we say full.
          </p>
          <div className="fm-roster" aria-hidden="true">
            <div className="fm-roster-avatars">
              {ROSTER.map((r, i) => (
                <span key={r} className={`fm-roster-avatar fm-roster-avatar--${i % 3}`}>{r}</span>
              ))}
              <span className="fm-roster-avatar fm-roster-avatar--you">You?</span>
            </div>
            <div className="fm-roster-cap">
              <span className="fm-cap-track"><span className="fm-cap-fill" style={{ width: '60%' }} /></span>
              <span className="fm-cap-label">6 of 10 flying</span>
            </div>
          </div>
        </div>

        <FindCard />
      </div>
    </section>
  )
}
