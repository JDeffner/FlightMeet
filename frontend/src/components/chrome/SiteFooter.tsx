import { Link } from 'react-router-dom'
import { Canopy } from '@/pages/home/Canopy'
import './chrome.css'

// Real section links (router-driven); the rest stay placeholder anchors.
const NAV_LINKS = [
  { to: '/meets', label: 'Meets' },
  { to: '/groups', label: 'Groups' },
  { to: '/weather', label: 'Weather' },
  { to: '/chat', label: 'Chat' },
]

const PLACEHOLDER_COLUMNS = [
  { title: 'Legal', links: ['Impressum', 'Datenschutz', 'AGB'] },
  { title: 'Support', links: ['Contact', 'FAQ', 'Safety guidelines'] },
  { title: 'Follow', links: ['Instagram', 'YouTube'] },
]

const footerWordmark = (
  <>
    <span className="fm-logo-flight" aria-hidden="true">Flight</span>
    <span className="fm-logo-meet" aria-hidden="true">
      M
      <span className="fm-logo-ee">
        ee
        <Canopy className="fm-canopy fm-canopy--footer" />
      </span>
      t
    </span>
  </>
)

/**
 * The landing page's hills + ink-bar footer, now shared by every page.
 *
 * - `variant="landing"`: hills overlap the CTA's sunset panel above (negative
 *   margin) and parallax via the [data-footer-hill] tweens in HomePage.tsx.
 * - `variant="app"` (default): no sunset panel above, so the hills get their own
 *   self-contained warm dusk gradient (see .fm-footer--app in chrome.css); the
 *   hills render static here (no landing scroll system to drive the parallax).
 */
export function SiteFooter({ variant = 'app' }: { variant?: 'landing' | 'app' }) {
  return (
    <footer className={variant === 'app' ? 'fm-footer fm-footer--app' : 'fm-footer'}>
      {/* Each ridge carries its own parallax speed (consumed by the scrub tween
          in HomePage.tsx on the landing page); the fills run past the viewBox
          bottom so no gap shows while a layer is displaced. */}
      <div className="fm-footer-hillwrap">
        <svg
          className="fm-footer-hills"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path
            data-footer-hill=""
            data-speed="-26"
            d="M0 84 Q240 30 480 74 T960 62 T1440 78 V180 H0 Z"
            fill="#5c3512"
            opacity="0.55"
          />
          <path
            data-footer-hill=""
            data-speed="-10"
            d="M0 104 Q300 58 620 96 T1140 88 T1440 100 V180 H0 Z"
            fill="#2b1608"
          />
        </svg>
      </div>

      <div className="fm-footer-base">
        <div className="fm-footer-brand">
          {variant === 'landing' ? (
            <a href="#hero" className="fm-footer-logo" aria-label="FlightMeet">
              {footerWordmark}
            </a>
          ) : (
            <Link to="/" className="fm-footer-logo" aria-label="FlightMeet — home">
              {footerWordmark}
            </Link>
          )}
          <span className="fm-footer-tag">The community platform for paraglider pilots.</span>
        </div>

        <div className="fm-footer-cols">
          <div className="fm-footer-col">
            <span className="fm-footer-col-title">Explore</span>
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
          {PLACEHOLDER_COLUMNS.map((col) => (
            <div key={col.title} className="fm-footer-col">
              <span className="fm-footer-col-title">{col.title}</span>
              {col.links.map((link) => (
                <a key={link} href="#">
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="fm-footer-legal">
          <span>© 2026 FlightMeet. All rights reserved.</span>
          <span>Fly safe. Check the weather.</span>
        </div>
      </div>
    </footer>
  )
}
