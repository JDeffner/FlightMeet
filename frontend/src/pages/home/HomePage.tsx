import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Hero } from './Hero'
import { Ticker } from './Ticker'
import { Steps } from './Steps'
import { Meets } from './Meets'
import { Cta } from './Cta'
import { Footer } from './Footer'
import './home.css'

gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin)

// Entrance props are cleared once a tween finishes so CSS :hover transforms
// keep working afterwards (GSAP would otherwise leave an inline transform behind).
const CLEAR = 'opacity,visibility,transform'

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
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

      // --- Hero parallax ---
      gsap.to('#hero-img', {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
      })

      // --- Ticker: position driven by scroll ---
      gsap.to('#ticker-track', {
        xPercent: -40,
        ease: 'none',
        scrollTrigger: { trigger: rootRef.current, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      })

      // --- Flight path: dashes drift + glider rides the arc with scroll ---
      gsap.to('#flight-path', { strokeDashoffset: -160, ease: 'none', duration: 10, repeat: -1 })
      gsap.to('#glider', {
        motionPath: { path: '#flight-path', align: '#flight-path', alignOrigin: [0.5, 0.5], autoRotate: true },
        ease: 'none',
        scrollTrigger: { trigger: '#steps', start: 'top 75%', end: 'bottom 45%', scrub: 0.8 },
      })

      // --- Step badges: thermal float ---
      gsap.utils.toArray<Element>('[data-float]').forEach((el, i) => {
        gsap.to(el, { y: -9, duration: 2.4 + i * 0.3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.4 })
      })

      // --- Repeat loop: path draws itself ---
      gsap.to('#loop-path', {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: { trigger: '#loop-path', start: 'top 92%', end: 'top 45%', scrub: 0.6 },
      })

      // Rising sun: huge (only its top arc peeking over the viewport bottom) when the
      // steps bottom meets the screen bottom, then shrinks into place, revealing its label.
      gsap
        .timeline({
          scrollTrigger: { trigger: '#repeat-badge', start: 'top-=150 bottom', end: 'top 42%', scrub: 0.6 },
        })
        .fromTo('#repeat-badge', { scale: 5.5, transformOrigin: 'center center' }, { scale: 1, ease: 'power1.inOut', duration: 1 }, 0)
        .fromTo('#repeat-sun > span', { autoAlpha: 0 }, { autoAlpha: 1, stagger: 0.06, duration: 0.28, ease: 'none' }, 0.68)
        .fromTo('#repeat-aura', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'none' }, 0.7)
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
        gsap.from(cards, {
          y: 90,
          autoAlpha: 0,
          duration: 1.1,
          ease: 'power2.out',
          stagger: 0.16,
          immediateRender: false,
          clearProps: CLEAR,
          scrollTrigger: { trigger: cards[0].parentNode as Element, start: 'top 82%', once: true },
        })
      }

      // --- Reveals (immediateRender:false → content is never pre-hidden) ---
      gsap.utils.toArray<Element>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 36,
          autoAlpha: 0,
          duration: 1,
          ease: 'power2.out',
          immediateRender: false,
          clearProps: CLEAR,
          scrollTrigger: { trigger: el, start: 'top 87%', once: true },
        })
      })

      // --- CTA: sun glow swells ---
      gsap.fromTo('#cta-glow', { scale: 0.75, opacity: 0.7, transformOrigin: '50% 100%' }, {
        scale: 1.25,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: '#cta', start: 'top bottom', end: 'bottom 20%', scrub: true },
      })
    },
    { scope: rootRef },
  )

  return (
    <div id="fm-root" ref={rootRef} className="fm-root">
      <Hero />
      <Ticker />
      <Steps />
      <Meets />
      <Cta />
      <Footer />
    </div>
  )
}
