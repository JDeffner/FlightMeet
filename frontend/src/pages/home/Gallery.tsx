import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import sunsetSilhouette from '@/assets/gallery/fly-sunset-silhouette.jpg'
import mountainSoar from '@/assets/gallery/fly-mountain-soar.jpg'
import orangeWing from '@/assets/gallery/fly-orange-wing.jpg'
import redWingClouds from '@/assets/gallery/fly-red-wing-clouds.jpg'
import goldenHour from '@/assets/gallery/fly-golden-hour.jpg'
import countryside from '@/assets/gallery/fly-countryside.jpg'
import alpineRidge from '@/assets/gallery/fly-alpine-ridge.jpg'
import duskSilhouette from '@/assets/gallery/fly-dusk-silhouette.jpg'
import highAbove from '@/assets/gallery/fly-high-above.jpg'
import './gallery.css'

type Shot = {
  img: string
  alt: string
  title: string
  by: string
  when: string
  tall?: boolean // portrait original: gets a narrower frame so the crop stays gentle
}

// Photos from unsplash.com/s/photos/paraglider (Unsplash License).
const ROWS: Shot[][] = [
  [
    {
      img: sunsetSilhouette,
      alt: 'Silhouette of a paraglider against the sunset',
      title: 'Sunset Session · Kandel',
      by: 'Lena K.',
      when: 'Saturday',
    },
    {
      img: orangeWing,
      alt: 'An orange wing against a deep blue sky',
      title: 'Club colors',
      by: 'Malik O.',
      when: 'Sunday',
      tall: true,
    },
    {
      img: mountainSoar,
      alt: 'A paraglider soaring close to a mountain face',
      title: 'Thermal Day · Brauneck',
      by: 'Mina T.',
      when: 'Sunday',
    },
    {
      img: countryside,
      alt: 'A paraglider high above green countryside',
      title: 'Home turf from 1,200 m',
      by: 'Jonas W.',
      when: 'Saturday',
      tall: true,
    },
    {
      img: goldenHour,
      alt: 'A paraglider hanging in golden-hour light',
      title: 'Chasing the last thermal',
      by: 'Sara R.',
      when: 'Friday',
    },
  ],
  [
    {
      img: alpineRidge,
      alt: 'A paraglider crossing an alpine ridge',
      title: 'Ridge crossing · Brauneck',
      by: 'Timo H.',
      when: 'Sunday',
    },
    {
      img: duskSilhouette,
      alt: 'A paraglider at dusk, wing dark against the sky',
      title: 'Last one down · Zeltingen',
      by: 'the Mosel crew',
      when: 'Wednesday',
      tall: true,
    },
    {
      img: redWingClouds,
      alt: 'A red wing under white clouds',
      title: 'Cloudbase within reach · Kandel',
      by: 'Ana P.',
      when: 'Saturday',
    },
    {
      img: highAbove,
      alt: 'A paraglider far above the valley floor',
      title: 'High over the Mosel',
      by: 'Malik O.',
      when: 'Wednesday',
    },
  ],
]

// Rows drift in opposite directions at different paces (duration = one full loop).
const DRIFT = [
  { from: 0, to: -50, duration: 70 },
  { from: -50, to: 0, duration: 100 },
]

export function Gallery() {
  const rootRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // Hover handler, wired up inside useGSAP where the tweens live. Eases the
  // hovered row to a stop instead of freezing it mid-frame.
  const setRowSpeed = useRef<(row: number, speed: number) => void>(() => {})
  const [active, setActive] = useState<Shot | null>(null)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useGSAP(
    (_context, contextSafe) => {
      if (reduced || !contextSafe) return
      const tweens = gsap.utils
        .toArray<HTMLElement>('.fm-wall-track', rootRef.current)
        .map((track, i) => {
          const d = DRIFT[i]
          return gsap.fromTo(
            track,
            { xPercent: d.from },
            { xPercent: d.to, duration: d.duration, ease: 'none', repeat: -1 },
          )
        })
      setRowSpeed.current = contextSafe((row: number, speed: number) => {
        const tween = tweens[row]
        if (tween) gsap.to(tween, { timeScale: speed, duration: 0.45, overwrite: true })
      })
    },
    { scope: rootRef },
  )

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [active])

  return (
    <section id="fly" className="fm-wall" ref={rootRef}>
      <div className="fm-section-head" data-reveal="">
        <span className="fm-kicker">Step 03 · Fly</span>
        <h2 className="fm-h2">This is why we fly</h2>
      </div>

      <div className="fm-wall-rows">
        {ROWS.map((shots, row) => (
          <div
            key={row}
            className={`fm-wall-row${reduced ? ' fm-wall-row--static' : ''}`}
            onMouseEnter={reduced ? undefined : () => setRowSpeed.current(row, 0)}
            onMouseLeave={reduced ? undefined : () => setRowSpeed.current(row, 1)}
          >
            <div className="fm-wall-track">
              {/* Second copy makes the 0 to -50% loop seamless; skipped for the
                  reduced-motion native scroller. */}
              {(reduced ? [false] : [false, true]).map((ghost) => (
                <div
                  key={String(ghost)}
                  className="fm-wall-group"
                  aria-hidden={ghost || undefined}
                >
                  {shots.map((shot) => (
                    <button
                      key={shot.title}
                      type="button"
                      className={`fm-wall-shot${shot.tall ? ' fm-wall-shot--tall' : ''}`}
                      tabIndex={ghost ? -1 : undefined}
                      onClick={() => setActive(shot)}
                    >
                      <img src={shot.img} alt={ghost ? '' : shot.alt} loading="lazy" />
                      <span className="fm-wall-cap">
                        <strong>{shot.title}</strong>
                        by {shot.by} · {shot.when}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div
          className="fm-wall-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActive(null)}
        >
          <button
            ref={closeRef}
            type="button"
            className="fm-wall-lightbox-close"
            aria-label="Close photo"
            onClick={() => setActive(null)}
          >
            ✕
          </button>
          <figure className="fm-wall-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img src={active.img} alt={active.alt} />
            <figcaption>
              <strong>{active.title}</strong>
              <span>by {active.by} · {active.when}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  )
}
