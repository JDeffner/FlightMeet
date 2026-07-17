import launchImg from '@/assets/launch-hillside.png'
import pilotImg from '@/assets/pilot-sunset.png'

const POINTS = [
  {
    n: '01',
    title: 'Good days go unflown',
    text: 'Perfect conditions arrive and pilots miss them. No plan, no group, no read on the weather until it is too late.',
  },
  {
    n: '02',
    title: 'One place to gather',
    text: 'Discover meets, judge the conditions, commit with a tap, and coordinate with the pilots who will be on the hill beside you.',
  },
  {
    n: '03',
    title: 'Take off together',
    text: 'Less logistics, more airtime. FlightMeet handles the finding and planning so you can focus on the flying.',
  },
]

export function Story() {
  return (
    <section id="story" className="fm-story">
      <div className="fm-story-copy">
        <span className="fm-kicker" data-reveal="">Why FlightMeet</span>
        <h2 className="fm-h2" data-reveal="">A sky is better shared.</h2>
        <p className="fm-story-intro" data-reveal="">
          Flying alone is a hobby. Flying together is a community. FlightMeet exists so a pilot
          never has to guess where the good air is, who&rsquo;s going, or whether tomorrow will fly.
        </p>
        <div className="fm-story-points">
          {POINTS.map((point) => (
            <div key={point.n} className="fm-story-point" data-reveal="">
              <span className="fm-story-num">{point.n}</span>
              <div>
                <h3 className="fm-h3">{point.title}</h3>
                <p>{point.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fm-story-media">
        <div className="fm-story-imgwrap">
          <img
            id="story-img"
            src={launchImg}
            alt="A paraglider wing laid out on a grassy launch hillside at golden hour"
            loading="lazy"
          />
        </div>
        <img
          className="fm-story-polaroid"
          src={pilotImg}
          alt="A smiling pilot in a helmet just before takeoff at sunset"
          loading="lazy"
          data-reveal=""
        />
      </div>
    </section>
  )
}
