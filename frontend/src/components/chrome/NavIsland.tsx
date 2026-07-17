import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link, NavLink } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ListIcon, XIcon } from '@phosphor-icons/react'
import { Canopy } from '@/pages/home/Canopy'
import { UserMenu } from '@/components/UserMenu'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import './chrome.css'

gsap.registerPlugin(ScrollTrigger)

const NAV_LINKS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/meets', label: 'Meets' },
  { to: '/groups', label: 'Groups' },
  { to: '/chat', label: 'Chat' },
  { to: '/weather', label: 'Weather' },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn('fm-nav-link', isActive && 'fm-nav-link--active')
}

/**
 * Drives the pill's condense/expand morph.
 *
 * The pill's width interpolates between the full-bleed expanded `calc()` and a
 * measured px value we stash in `--fm-nav-compact-w`; because both endpoints are
 * concrete lengths, one CSS transition (with matched easing on top/padding/logo)
 * does the whole morph. No GSAP width tween, no FLIP, no clearProps snap; rapid
 * scroll flips simply reverse the live transition, and reduced-motion users get
 * an instant swap via the `@media (prefers-reduced-motion)` rule in chrome.css.
 */
function useNavCondense(
  navRef: RefObject<HTMLElement | null>,
  variant: 'landing' | 'app',
  hasUser: boolean,
  isAdmin: boolean,
) {
  // Measure the compact (content) width into --fm-nav-compact-w. Re-run whenever
  // content that affects that width changes: auth state, admin link, font load,
  // viewport size.
  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current
      if (!el) return
      const prevTransition = el.style.transition
      const wasCompact = el.classList.contains('fm-nav--compact')
      // Suspend transitions and read the natural content width in the compact
      // configuration, synchronously, so nothing paints mid-measurement.
      el.style.transition = 'none'
      el.classList.add('fm-nav--compact')
      el.style.width = 'max-content'
      const w = Math.ceil(el.getBoundingClientRect().width)
      el.style.width = ''
      if (!wasCompact) el.classList.remove('fm-nav--compact')
      void el.offsetWidth // flush the reflow before restoring the transition
      el.style.transition = prevTransition
      el.style.setProperty('--fm-nav-compact-w', `${w}px`)
    }

    measure()

    let cancelled = false
    // The wordmark width depends on Bricolage Grotesque; re-measure once loaded.
    if (document.fonts) {
      void document.fonts.ready.then(() => {
        if (!cancelled) measure()
      })
    }

    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
    // hasUser/isAdmin/variant are re-measure triggers, not values read here.
  }, [navRef, variant, hasUser, isAdmin])

  // Condense trigger. Landing condenses when the hero scrolls out (ScrollTrigger,
  // sharing the landing scroll system); app pages start expanded and condense
  // after ~80px of plain scroll (no ScrollTrigger dependency).
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const setCompact = (on: boolean) => nav.classList.toggle('fm-nav--compact', on)

    if (variant === 'landing') {
      const st = ScrollTrigger.create({
        trigger: '#hero',
        start: 'bottom 96px',
        onEnter: () => setCompact(true),
        onLeaveBack: () => setCompact(false),
      })
      return () => st.kill()
    }

    const onScroll = () => setCompact(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [navRef, variant])
}

/**
 * The FlightMeet nav island: the landing page's celebrated pill, now shared by
 * every page. The wordmark morphs FlightMeet -> FM as the pill condenses.
 *
 * - `variant="landing"`: condenses when #hero scrolls out; logo scrolls to top.
 * - `variant="app"` (default): condenses after ~80px of scroll; logo links home.
 */
export function NavIsland({ variant = 'app' }: { variant?: 'landing' | 'app' }) {
  const { user, isAdmin } = useAuth()
  const navRef = useRef<HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)

  useNavCondense(navRef, variant, !!user, isAdmin)

  // Close the mobile panel on outside pointer / scroll while open. (Selecting a
  // link inside the panel closes it via each link's onClick; a tap on the
  // signed-in UserMenu's portaled dropdown counts as an outside pointer.)
  useEffect(() => {
    if (!mobileOpen) return
    const close = () => setMobileOpen(false)
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', close, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', close)
    }
  }, [mobileOpen])

  // The morphing wordmark: "light"/"eet" collapse and the canopy cross-fades
  // from the "ee" to the FM pair as .fm-nav--compact takes hold (see chrome.css).
  const wordmark = (
    <>
      <span className="fm-logo-flight" aria-hidden="true">F</span>
      <span className="fm-logo-flight fm-logo-ext fm-logo-ext--light" aria-hidden="true">light</span>
      <span className="fm-logo-meet fm-logo-m" aria-hidden="true">
        M
        <Canopy className="fm-canopy fm-canopy--ee" />
      </span>
      <span className="fm-logo-meet fm-logo-ext fm-logo-ext--eet" aria-hidden="true">eet</span>
      <Canopy className="fm-canopy fm-canopy--fm" />
    </>
  )

  return (
    <nav
      id="nav-island"
      ref={navRef}
      className="fm-nav"
      aria-label="Main"
      data-mobile-open={mobileOpen ? 'true' : 'false'}
    >
      {variant === 'landing' ? (
        <a href="#hero" className="fm-logo" aria-label="FlightMeet">
          {wordmark}
        </a>
      ) : (
        <Link to="/" className="fm-logo" aria-label="FlightMeet — home">
          {wordmark}
        </Link>
      )}

      <div className="fm-nav-menu">
        <div className="fm-nav-links">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={navLinkClass}
              onClick={closeMobile}
            >
              {link.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin/dashboard" className={navLinkClass} onClick={closeMobile}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="fm-nav-auth">
          {user ? (
            <UserMenu variant="landing" />
          ) : (
            <>
              <Link to="/login" className="fm-nav-login" onClick={closeMobile}>
                Log in
              </Link>
              <Link to="/register" className="fm-nav-signup" onClick={closeMobile}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="fm-nav-burger"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <XIcon weight="bold" /> : <ListIcon weight="bold" />}
      </button>
    </nav>
  )
}
