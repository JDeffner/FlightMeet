const ITEMS = ['Find meets', 'Plan flight days', 'Join groups', 'Stay in touch']

export function Ticker() {
  return (
    <section className="fm-ticker">
      <div id="ticker-track" className="fm-ticker-track">
        {[0, 1, 2].map((group) => (
          <div key={group} className="fm-ticker-group">
            {ITEMS.map((item) => (
              <span key={item} style={{ display: 'contents' }}>
                <span>{item}</span>
                <span className="fm-ticker-star">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
