export function Cta() {
  return (
    <section id="cta" className="fm-cta">
      <div id="cta-panel" className="fm-cta-panel">
        <div id="cta-glow" className="fm-cta-glow" />
        <div className="fm-cta-inner">
          <h2 className="fm-cta-title" data-reveal="">Golden hour is better together.</h2>
          <p className="fm-cta-sub" data-reveal="">
            Join a group, plan your next flight day, and keep in touch with your crew.
          </p>
          <a href="#meets" className="fm-cta-btn" data-reveal="">
            <span>Find your meet</span>
            <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
