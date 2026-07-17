import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Hero } from './Hero'
import { Story } from './Story'
import { Steps } from './Steps'
import { Meets } from './Meets'
import { LiveFeed } from './LiveFeed'
import { Features } from './Features'
import { QuoteInterlude } from './QuoteInterlude'
import { Gallery } from './Gallery'
import { RepeatSun } from './RepeatSun'
import { Testimonials } from './Testimonials'
import { ProgressRail } from './ProgressRail'
import { Cta } from './Cta'
import { SiteFooter } from '@/components/chrome/SiteFooter'
import './home.css'

gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin)

// Entrance props are cleared once a tween finishes so CSS :hover transforms
// keep working afterwards (GSAP would otherwise leave an inline transform behind).
const CLEAR = 'opacity,visibility,transform'

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      // The nav condense/morph (FlightMeet -> FM) now lives in NavIsland, which
      // owns its own ScrollTrigger in landing mode. Reduced-motion users get no
      // entrance choreography here (their nav swap stays instant via CSS).
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // --- Hero entrance ---
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('#hero-img', { scale: 1.14, duration: 2.4, ease: 'power2.out' }, 0)
        .from('#nav-island', { y: -30, autoAlpha: 0, duration: 0.9, clearProps: CLEAR }, 0.25)
        .from('#hero-eyebrow', { y: 18, autoAlpha: 0, duration: 0.6, clearProps: CLEAR }, 0.35)
        .from('[data-hero-line] > span', { yPercent: 115, duration: 1.15, stagger: 0.14, ease: 'power4.out' }, 0.45)
        .from('#hero-sub', { y: 26, autoAlpha: 0, duration: 0.8, clearProps: CLEAR }, 1.0)
        .from('[data-hero-cta]', { y: 26, autoAlpha: 0, stagger: 0.1, duration: 0.7, clearProps: CLEAR }, 1.15)

      // --- Hero scroll parallax ---
      gsap.to('#hero-img', {
        yPercent: 5,
        ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      })

      // --- Story: launch photo drifts inside its frame ---
      gsap.to('#story-img', {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: '#story', start: 'top bottom', end: 'bottom top', scrub: true },
      })

      // --- Flight path: dashes drift + glider rides the arc with scroll ---
      gsap.to('#flight-path', { strokeDashoffset: -160, ease: 'none', duration: 10, repeat: -1 })
      gsap.to('#glider', {
        motionPath: { path: '#flight-path', align: '#flight-path', alignOrigin: [0.5, 0.5], autoRotate: true },
        ease: 'none',
        scrollTrigger: { trigger: '#steps', start: 'top 75%', end: 'bottom 45%', scrub: 0.8 },
      })

      // --- Step badges pop onto the flight path, then pulse 1 -> 2 -> 3 so the
      // sequence reads as "look at (and click) these in order". Their CSS hover
      // transition is suspended while GSAP owns the transform (same pattern as
      // the meet cards) and restored by the final clearProps. ---
      const stepBadges = gsap.utils.toArray<HTMLElement>('.fm-step-dots .fm-step-badge')
      gsap.set(stepBadges, { transition: 'none' })
      gsap
        .timeline({ scrollTrigger: { trigger: '#steps .fm-steps-wrap', start: 'top 70%', once: true } })
        .from(stepBadges, { scale: 0, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.18 })
        .to(
          stepBadges,
          { scale: 1.18, boxShadow: '0 10px 30px rgba(232, 100, 31, 0.42)', duration: 0.3, ease: 'power2.out', stagger: 0.55 },
          '+=0.15',
        )
        .to(
          stepBadges,
          {
            scale: 1,
            boxShadow: '0 8px 24px rgba(232, 100, 31, 0.18)',
            duration: 0.45,
            ease: 'power2.inOut',
            stagger: 0.55,
            clearProps: CLEAR + ',boxShadow,transition',
          },
          '<0.3',
        )

      // --- Repeat loop: same dashed line as the steps flight path, dashes
      // drifting along the travel direction (in from above, through the sun,
      // back up toward the start), while the glider from the steps section
      // reappears and rides it down, melting into the sun at the low point.
      // autoRotate is offset 180° because it travels the path right-to-left:
      // the tangent alone would hang the canopy upside down. ---
      gsap.to('#loop-path', { strokeDashoffset: -160, ease: 'none', duration: 10, repeat: -1 })
      gsap
        .timeline({
          scrollTrigger: { trigger: '#loop-path', start: 'top 92%', end: 'top 42%', scrub: 0.8 },
        })
        .to('#loop-glider', {
          motionPath: {
            path: '#loop-path',
            align: '#loop-path',
            alignOrigin: [0.5, 0.5],
            autoRotate: 180,
            end: 0.5,
          },
          ease: 'none',
          duration: 0.9,
        })
        .to('#loop-glider', { autoAlpha: 0, duration: 0.1, ease: 'none' })

      // Rising sun: drifts up into place along the loop line as it scrolls in,
      // then the label, rays and caption fade on. Gentle, like the site's other
      // entrances.
      gsap
        .timeline({
          scrollTrigger: { trigger: '#repeat-badge', start: 'top 98%', end: 'top 52%', scrub: 0.6 },
        })
        .fromTo(
          '#repeat-badge',
          { y: 130, scale: 0.8, autoAlpha: 0, transformOrigin: 'center center' },
          { y: 0, scale: 1, autoAlpha: 1, ease: 'power1.out', duration: 1 },
          0,
        )
        .fromTo('.fm-loop-caption', { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'none' }, 0.15)
        .fromTo('#repeat-sun > span', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28, ease: 'none' }, 0.6)
        .fromTo('#repeat-aura', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none' }, 0.65)
      gsap.to('#repeat-rays', { rotation: 360, duration: 26, ease: 'none', repeat: -1, transformOrigin: 'center center' })
      gsap.fromTo('#repeat-pulse', { scale: 1, opacity: 0.7 }, { scale: 1.45, opacity: 0, duration: 2, ease: 'power1.out', repeat: -1 })

      // --- Meets: panel + photo zoom-settle as the section scrolls in ---
      gsap.fromTo('#meets-panel', { scale: 0.86 }, {
        scale: 1,
        ease: 'power1.out',
        scrollTrigger: { trigger: '#meets', start: 'top 95%', end: 'top 28%', scrub: 0.5 },
      })
      gsap.fromTo('#meets-bg', { scale: 1.35 }, {
        scale: 1,
        ease: 'power1.out',
        scrollTrigger: { trigger: '#meets', start: 'top 95%', end: 'top 28%', scrub: 0.5 },
      })

      // --- Meets background parallax ---
      gsap.to('#meets-bg', {
        yPercent: 9,
        ease: 'none',
        scrollTrigger: { trigger: '#meets', start: 'top bottom', end: 'bottom top', scrub: true },
      })

      // --- Glass cards rise in ---
      const cards = gsap.utils.toArray<Element>('[data-card]')
      if (cards.length) {
        // .fm-card transitions transform for its hover lift; that transition would
        // fight GSAP's per-frame transform writes during the entrance, so suspend it
        // and let clearProps restore it once the tween settles.
        gsap.set(cards, { transition: 'none' })
        gsap.from(cards, {
          y: 90,
          autoAlpha: 0,
          duration: 1.1,
          ease: 'power2.out',
          stagger: 0.16,
          clearProps: CLEAR + ',transition',
          scrollTrigger: { trigger: cards[0].parentNode as Element, start: 'top 82%', once: true },
        })
      }

      // --- Feature cells rise in ---
      gsap.from('[data-feat]', {
        y: 70,
        autoAlpha: 0,
        duration: 1,
        ease: 'power2.out',
        stagger: 0.12,
        clearProps: CLEAR,
        scrollTrigger: { trigger: '#features .fm-feat-grid', start: 'top 80%', once: true },
      })

      // --- Chat bubbles pop in like a live plan coming together ---
      gsap.from('[data-bubble]', {
        y: 22,
        autoAlpha: 0,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.3,
        clearProps: CLEAR,
        scrollTrigger: { trigger: '.fm-bubbles', start: 'top 82%', once: true },
      })

      // --- Pilot photo cards rise and settle into their tilt ---
      // (tilt lives on the inner .fm-pilot-card, so GSAP's transform on the
      // wrapper never fights the CSS rotation)
      gsap.from('[data-pilot]', {
        y: 80,
        autoAlpha: 0,
        duration: 1,
        ease: 'power2.out',
        stagger: 0.15,
        clearProps: CLEAR,
        scrollTrigger: { trigger: '#pilots .fm-pilots-grid', start: 'top 82%', once: true },
      })

      // --- Reveals: from() renders its hidden state at creation (pre-paint), so
      // elements enter the viewport already hidden instead of flashing visible
      // until the trigger line and then popping out ---
      gsap.utils.toArray<Element>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 36,
          autoAlpha: 0,
          duration: 1,
          ease: 'power2.out',
          clearProps: CLEAR,
          scrollTrigger: { trigger: el, start: 'top 87%', once: true },
        })
      })

      // --- CTA: canopy silhouettes drift upward at their own speeds ---
      gsap.utils.toArray<HTMLElement>('[data-cta-canopy]').forEach((el) => {
        gsap.to(el, {
          y: Number(el.dataset.speed),
          ease: 'none',
          scrollTrigger: { trigger: '#cta', start: 'top bottom', end: 'bottom top', scrub: true },
        })
      })

      // --- CTA: sun glow swells ---
      gsap.fromTo('#cta-glow', { scale: 0.75, opacity: 0.7, transformOrigin: '50% 100%' }, {
        scale: 1.25,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: '#cta', start: 'top bottom', end: 'bottom 20%', scrub: true },
      })

      // --- Footer hills: each ridge settles into place at its own speed while
      // the footer scrolls in, so the range reads as depth under the setting
      // sun. fromTo ending at 0 so the layers rest seamlessly at max scroll. ---
      gsap.utils.toArray<SVGPathElement>('[data-footer-hill]').forEach((el) => {
        gsap.fromTo(el, { y: Number(el.dataset.speed) }, {
          y: 0,
          ease: 'none',
          scrollTrigger: { trigger: '.fm-footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
        })
      })

      // ===== Pointer interactions =====

      // Magnetic buttons: primary CTAs lean toward the cursor and spring back.
      gsap.utils.toArray<HTMLElement>('[data-magnet]').forEach((el) => {
        const mx = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' })
        const my = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' })
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect()
          mx((e.clientX - (r.left + r.width / 2)) * 0.32)
          my((e.clientY - (r.top + r.height / 2)) * 0.4)
        })
        el.addEventListener('pointerleave', () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1.1, 0.5)', overwrite: 'auto' })
        })
      })

      // Pilot prints tilt in 3D under the cursor, like a photo picked up
      // off a table, and settle back with a soft spring.
      gsap.utils.toArray<HTMLElement>('.fm-pilot-card').forEach((card) => {
        gsap.set(card, { transformPerspective: 800 })
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.45, ease: 'power2.out' })
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.45, ease: 'power2.out' })
        const lift = gsap.quickTo(card, 'y', { duration: 0.4, ease: 'power2.out' })
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect()
          rx(-((e.clientY - r.top) / r.height - 0.5) * 7)
          ry(((e.clientX - r.left) / r.width - 0.5) * 9)
          lift(-6)
        })
        card.addEventListener('pointerleave', () => {
          gsap.to(card, { rotationX: 0, rotationY: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' })
        })
      })

      // Weather card: the sky photo drifts gently against the cursor.
      const weatherCard = rootRef.current?.querySelector<HTMLElement>('.fm-feat--weather')
      if (weatherCard) {
        const bg = weatherCard.querySelector('.fm-feat-bg')
        gsap.set(bg, { scale: 1.07 })
        const bx = gsap.quickTo(bg, 'xPercent', { duration: 0.6, ease: 'power2.out' })
        const by = gsap.quickTo(bg, 'yPercent', { duration: 0.6, ease: 'power2.out' })
        weatherCard.addEventListener('pointermove', (e) => {
          const r = weatherCard.getBoundingClientRect()
          bx(((e.clientX - r.left) / r.width - 0.5) * -2.5)
          by(((e.clientY - r.top) / r.height - 0.5) * -2.5)
        })
        weatherCard.addEventListener('pointerleave', () => {
          bx(0)
          by(0)
        })
      }
    },
    { scope: rootRef },
  )

  return (
    <div id="fm-root" ref={rootRef} className="fm-root">
      <ProgressRail />
      <Hero />
      <Story />
      <Steps />
      <Meets />
      <LiveFeed />
      <Features />
      <Gallery />
      <RepeatSun />
      <QuoteInterlude />
      <Testimonials />
      <Cta />
      <SiteFooter variant="landing" />
    </div>
  )
}
