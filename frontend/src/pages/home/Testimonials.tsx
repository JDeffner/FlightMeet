import lenaImg from '@/assets/portrait-lena.png'
import malikImg from '@/assets/portrait-malik.png'
import minaImg from '@/assets/portrait-mina.png'

const PILOTS = [
  {
    img: lenaImg,
    alt: 'Lena, a pilot from the Black Forest, smiling at golden hour',
    quote: '“I stopped juggling four apps and a group chat. One look at FlightMeet and I know if Saturday flies.”',
    name: 'Lena K.',
    meta: 'Black Forest · 240 flights',
  },
  {
    img: malikImg,
    alt: 'Malik, a pilot from the Mosel Valley, smiling in his harness',
    quote: '“Joined my first meet two weeks after my license. Landed with three new flying buddies.”',
    name: 'Malik O.',
    meta: 'Mosel Valley · B-license 2025',
  },
  {
    img: minaImg,
    alt: 'Mina, a pilot from the Bavarian Alps, looking over the ridge at sunrise',
    quote: '“The forecast on the meet page is what finally got my crew organized. We fly twice as often now.”',
    name: 'Mina T.',
    meta: 'Bavarian Alps · XC pilot',
  },
]

export function Testimonials() {
  return (
    <section id="pilots" className="fm-pilots">
      <div className="fm-section-head" data-reveal="">
        <span className="fm-kicker">Pilot voices</span>
        <h2 className="fm-h2">For pilots, by pilots</h2>
      </div>

      <div className="fm-pilots-grid">
        {PILOTS.map((pilot) => (
          <div key={pilot.name} className="fm-pilot" data-pilot="">
            <figure className="fm-pilot-card">
              <img className="fm-pilot-img" src={pilot.img} alt={pilot.alt} loading="lazy" />
              <blockquote className="fm-pilot-quote">{pilot.quote}</blockquote>
              <figcaption>
                <div className="fm-pilot-name">{pilot.name}</div>
                <div className="fm-pilot-meta">{pilot.meta}</div>
              </figcaption>
            </figure>
          </div>
        ))}
      </div>
    </section>
  )
}
