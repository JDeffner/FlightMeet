// Each step number links to the section that shows that step in action.
const STEPS = [
  {
    title: 'Find a meet',
    text: 'Search by site, region and skill level, or create your own in a minute.',
    position: 'fm-step--outer',
    target: '#meets',
  },
  {
    title: 'Plan the day',
    text: "See who's coming, chat with the other pilots, and plan the day together.",
    position: 'fm-step--mid',
    target: '#features',
  },
  {
    title: 'Fly together',
    text: 'Meet and chase the light.',
    position: 'fm-step--outer',
    target: '#fly',
  },
]

// Badge centers sit exactly on the quadratic flight path (M 20 168 Q 600 -50
// 1180 168, viewBox 1200x190) evaluated at t = 0.12 / 0.5 / 0.88, mapped to
// the wrap: the svg spans left 3% → 97% and sits 10px from the top.
const DOTS = [
  { left: '15.5%', top: 132 },
  { left: '50%', top: 69 },
  { left: '84.5%', top: 132 },
]

export function Steps() {
  return (
    <section id="steps" className="fm-steps">
      <div className="fm-section-head" data-reveal="">
        <span className="fm-kicker">Find · Plan · Fly</span>
        <h2 className="fm-h2">Three steps to golden hour</h2>
      </div>

      <div className="fm-steps-wrap">
        <svg className="fm-flight-svg" viewBox="0 0 1200 190" preserveAspectRatio="none" fill="none">
          <path
            id="flight-path"
            d="M 20 168 Q 600 -50 1180 168"
            stroke="var(--fm-accent)"
            strokeWidth="2.5"
            strokeDasharray="2 14"
            strokeLinecap="round"
            opacity="0.75"
          />
          <g id="glider" opacity="0.95">
            <g transform="scale(1.8)">
              <path d="M -16 -6 Q 0 -18 16 -6 Q 0 -10 -16 -6 Z" fill="var(--fm-accent)" />
              <path d="M -10 -8 L 0 4 L 10 -8" stroke="var(--fm-accent)" strokeWidth="1.4" fill="none" />
              <circle cx="0" cy="6" r="3" fill="#2B1608" />
            </g>
          </g>
        </svg>

        <div className="fm-step-dots">
          {DOTS.map((dot, i) => (
            <a
              key={i}
              href={STEPS[i].target}
              aria-label={`Step ${i + 1}: ${STEPS[i].title}`}
              className="fm-step-badge"
              style={{ left: dot.left, top: dot.top + 10 }}
            >
              {i + 1}
            </a>
          ))}
        </div>

        <div className="fm-steps-grid">
          {STEPS.map((step, i) => (
            <div key={step.title} className={`fm-step ${step.position}`} data-reveal="">
              <a
                href={step.target}
                aria-label={`Step ${i + 1}: ${step.title}`}
                className="fm-step-badge fm-step-badge--inline"
              >
                {i + 1}
              </a>
              <h3 className="fm-h3">{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
