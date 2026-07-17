import { Link } from 'react-router-dom'

// Canopy silhouettes drift upward at their own speeds while the CTA scrolls
// (data-speed is consumed by the scrub tween in HomePage.tsx).
const CANOPIES = [
  { speed: -40, style: { left: '8%', top: '16%' }, width: 120, fill: '#3a2214' },
  { speed: -90, style: { left: '26%', top: '40%' }, width: 70, fill: '#5c3512' },
  { speed: -60, style: { right: '12%', top: '20%' }, width: 95, fill: '#3a2214' },
  { speed: -120, style: { right: '28%', top: '50%' }, width: 55, fill: '#7a4a22' },
]

export function Cta() {
  return (
    <section id="cta" className="fm-cta">
      <div id="cta-panel" className="fm-cta-panel">
        <div id="cta-glow" className="fm-cta-glow" />
        <div className="fm-cta-sun" aria-hidden="true" />
        {CANOPIES.map((c, i) => (
          <svg
            key={i}
            className="fm-cta-canopy"
            data-cta-canopy=""
            data-speed={c.speed}
            style={{ ...c.style, width: c.width }}
            viewBox="0 0 60 22"
            fill="none"
            aria-hidden="true"
          >
            <path d="M5 20 Q30 0 55 20 Q30 10 5 20 Z" fill={c.fill} />
          </svg>
        ))}
        <div className="fm-cta-inner">
          <h2 className="fm-cta-title" data-reveal="">Golden hour is better together.</h2>
          <p className="fm-cta-sub" data-reveal="">
            Join a group, plan your next flight day, and keep in touch with your crew.
          </p>
          <Link to="/meets" className="fm-cta-btn" data-reveal="" data-magnet="">
            <span>Find your meet</span>
            <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
