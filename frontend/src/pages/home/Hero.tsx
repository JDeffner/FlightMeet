import heroImg from '@/assets/hero-paraglider.png'

export function Hero() {
  return (
    <section id="hero" className="fm-hero">
      <img id="hero-img" className="fm-hero-img" src={heroImg} alt="Paraglider at golden hour" />
      <div className="fm-hero-fade" />

      <nav id="nav-island" className="fm-nav">
        <a href="#hero" className="fm-logo">
          <span className="fm-logo-flight">Flight</span>
          <span className="fm-logo-meet">Meet</span>
        </a>
        <div className="fm-nav-links">
          <a href="#hero" className="fm-nav-link fm-nav-link--active">Home</a>
          <a href="#meets" className="fm-nav-link">Meets</a>
          <a href="#steps" className="fm-nav-link">Groups</a>
          <a href="#cta" className="fm-nav-link">Chat</a>
        </div>
        <div className="fm-nav-auth">
          <a href="#" className="fm-nav-login">Log in</a>
          <a href="#" className="fm-nav-signup">Sign up</a>
        </div>
      </nav>

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
            Find meets near you, plan flight days with other pilots — and take off together.
          </p>
          <div className="fm-hero-ctas">
            <a data-hero-cta="" href="#meets" className="fm-btn-primary">
              <span>Find a meet</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </a>
            <a data-hero-cta="" href="#steps" className="fm-btn-ghost">Browse groups</a>
          </div>
        </div>
      </div>
    </section>
  )
}
