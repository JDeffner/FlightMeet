const STEPS = [
  {
    title: 'Find a meet',
    text: 'Search by site, region and skill level — or create your own in a minute.',
    position: 'fm-step--outer',
  },
  {
    title: 'Plan the day',
    text: "See who's coming, chat with the other pilots, and plan the day together.",
    position: 'fm-step--mid',
  },
  {
    title: 'Fly together',
    text: 'Meet and chase the light.',
    position: 'fm-step--outer',
  },
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
            <path d="M -16 -6 Q 0 -18 16 -6 Q 0 -10 -16 -6 Z" fill="var(--fm-accent)" />
            <path d="M -10 -8 L 0 4 L 10 -8" stroke="var(--fm-accent)" strokeWidth="1.4" fill="none" />
            <circle cx="0" cy="6" r="3" fill="#2B1608" />
          </g>
        </svg>

        <div className="fm-steps-grid">
          {STEPS.map((step, i) => (
            <div key={step.title} className={`fm-step ${step.position}`} data-reveal="">
              <div className="fm-step-badge" data-float="">{i + 1}</div>
              <h3 className="fm-h3">{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>

        {/* Repeat loop: draws itself on scroll, ends in a rising sun */}
        <div className="fm-loop">
          <svg className="fm-loop-svg" viewBox="0 0 1200 200" preserveAspectRatio="none" fill="none">
            <path
              id="loop-path"
              pathLength={1}
              d="M 1180 10 C 1150 150, 700 185, 600 185 C 500 185, 50 150, 20 10"
              stroke="var(--fm-accent)"
              strokeWidth="2.5"
              strokeDasharray="1"
              strokeDashoffset="1"
              strokeLinecap="round"
              opacity="0.75"
            />
          </svg>
          <div id="repeat-badge" className="fm-repeat-badge">
            <div id="repeat-aura" className="fm-repeat-aura">
              <svg
                id="repeat-rays"
                className="fm-repeat-rays"
                width="230"
                height="230"
                viewBox="0 0 230 230"
                fill="none"
                stroke="var(--fm-accent)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.8"
              >
                <line x1="213" y1="115" x2="227" y2="115" />
                <line x1="200" y1="164" x2="212" y2="171" />
                <line x1="164" y1="200" x2="171" y2="212" />
                <line x1="115" y1="213" x2="115" y2="227" />
                <line x1="66" y1="200" x2="59" y2="212" />
                <line x1="30" y1="164" x2="18" y2="171" />
                <line x1="17" y1="115" x2="3" y2="115" />
                <line x1="30" y1="66" x2="18" y2="59" />
                <line x1="66" y1="30" x2="59" y2="18" />
                <line x1="115" y1="17" x2="115" y2="3" />
                <line x1="164" y1="30" x2="171" y2="18" />
                <line x1="200" y1="66" x2="212" y2="59" />
              </svg>
              <div id="repeat-pulse" className="fm-repeat-pulse" />
            </div>
            <a id="repeat-sun" href="#meets" className="fm-repeat-sun">
              <span className="fm-repeat-sun-title">Repeat?</span>
              <span className="fm-repeat-sun-sub">Chase it again</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
