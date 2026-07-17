import { Link } from 'react-router-dom'
import heroImg from '@/assets/hero-sky.png'
import { NavIsland } from '@/components/chrome/NavIsland'

export function Hero() {
  return (
    <section id="hero" className="fm-hero">
      <div id="hero-img" className="fm-hero-media">
        <img
          className="fm-hero-img"
          src={heroImg}
          alt="A group of paragliders sharing a golden-hour sky"
          fetchPriority="high"
        />
      </div>

      <NavIsland variant="landing" />

      <div className="fm-hero-copy">
        <div id="hero-eyebrow" className="fm-hero-eyebrow">Find · Plan · Fly</div>
        <h1 className="fm-hero-title">
          <div className="fm-hero-line" data-hero-line="">
            <span>Take off</span>
          </div>
          <div className="fm-hero-line fm-hero-line--accent" data-hero-line="">
            <span>together.</span>
          </div>
        </h1>
        <div className="fm-hero-row">
          <p id="hero-sub" className="fm-hero-sub">
            Find meets near you, plan flight days with other pilots, and take off together when the
            air is right.
          </p>
          <div className="fm-hero-ctas">
            <Link data-hero-cta="" to="/meets" className="fm-btn-primary">
              <span>Find a meet</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </Link>
            <a data-hero-cta="" href="#story" className="fm-btn-ghost">
              Why FlightMeet
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
