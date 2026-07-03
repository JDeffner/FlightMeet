const COLUMNS = [
  { title: 'Legal', links: ['Impressum', 'Datenschutz', 'AGB'] },
  { title: 'Support', links: ['Contact', 'FAQ', 'Safety guidelines'] },
  { title: 'Follow', links: ['Instagram', 'YouTube'] },
]

export function Footer() {
  return (
    <footer className="fm-footer">
      <div className="fm-footer-top">
        <div className="fm-footer-brand">
          <a href="#hero" className="fm-footer-logo">
            <span className="fm-logo-flight">Flight</span>
            <span className="fm-logo-meet">Meet</span>
          </a>
          <span className="fm-footer-tag">The community platform for paraglider pilots.</span>
        </div>
        <div className="fm-footer-cols">
          {COLUMNS.map((col) => (
            <div key={col.title} className="fm-footer-col">
              <span className="fm-footer-col-title">{col.title}</span>
              {col.links.map((link) => (
                <a key={link} href="#">{link}</a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="fm-footer-bottom">
        <span>© 2026 FlightMeet. All rights reserved.</span>
        <span>Fly safe. Check the weather.</span>
      </div>
    </footer>
  )
}
