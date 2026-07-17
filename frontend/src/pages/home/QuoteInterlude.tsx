import { Canopy } from './Canopy'
import gliderDuo from '@/assets/gallery/jayanth-muppaneni-ALokQgxGuWA-unsplash.jpg'

export function QuoteInterlude() {
  return (
    <section id="quote" className="fm-quote">
      <img
        className="fm-quote-bg"
        src={gliderDuo}
        alt="Two pilots in gliders flying together against a dusk sky"
        loading="lazy"
      />
      <div className="fm-quote-inner" data-reveal="">
        <Canopy className="fm-quote-canopy" />
        <blockquote className="fm-quote-text">
          “You never remember the altitude. You remember <em>who was circling beside you</em> when
          the valley turned gold.”
        </blockquote>
        <div className="fm-quote-by">Resi A. · Tegelberg regular · 480 flights</div>
      </div>
    </section>
  )
}
