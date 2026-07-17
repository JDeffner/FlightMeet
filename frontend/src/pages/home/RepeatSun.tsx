// Repeat loop: after step 3 ("Fly", the photo wall) the flight line loops back
// and the glider from the steps section reappears, riding it down into a
// golden-hour sun that links back to the three-steps section.
export function RepeatSun() {
  return (
    <section aria-label="Repeat the loop" className="fm-loop-section">
      <div className="fm-loop">
        {/* The line overshoots the top edge on both sides (overflow visible):
            it arrives from the section above and exits back up toward the
            steps, so the loop visibly plugs into the rest of the journey. */}
        <svg className="fm-loop-svg" viewBox="0 0 1200 200" preserveAspectRatio="none" fill="none">
          <path
            id="loop-path"
            d="M 1180 -30 C 1150 140, 700 185, 600 185 C 500 185, 50 140, 20 -30"
            stroke="var(--fm-accent)"
            strokeWidth="2.5"
            strokeDasharray="2 14"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Same glider as the steps flight path: it left that line on the
              right edge and re-enters this one there (HomePage rides it to 0.5,
              where the sun waits). */}
          <g id="loop-glider" opacity="0.95">
            <g transform="scale(1.8)">
              <path d="M -16 -6 Q 0 -18 16 -6 Q 0 -10 -16 -6 Z" fill="var(--fm-accent)" />
              <path d="M -10 -8 L 0 4 L 10 -8" stroke="var(--fm-accent)" strokeWidth="1.4" fill="none" />
              <circle cx="0" cy="6" r="3" fill="#2B1608" />
            </g>
          </g>
        </svg>
        <a href="#steps" className="fm-loop-caption">Find · Plan · Fly · Repeat</a>
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
          <a id="repeat-sun" href="#steps" className="fm-repeat-sun">
            <span className="fm-repeat-sun-title">Repeat?</span>
          </a>
        </div>
      </div>
    </section>
  )
}
