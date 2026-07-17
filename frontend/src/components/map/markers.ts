// Brand map markers, built with L.divIcon so we never touch Leaflet's default
// PNG icons (their asset paths break under Vite, and they are off-brand anyway).
// The pin is an inline SVG teardrop in accent orange with an ink outline; the
// drop shadow and the selected-state glow live in map.css.
import L from 'leaflet'

// Teardrop pin drawn on a 30x40 canvas, tip at the bottom-centre. width/height
// are 100% so the same artwork scales to whichever iconSize we hand Leaflet.
const PIN_SVG = `
<svg viewBox="0 0 30 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M15 38.5 C15 38.5 3.5 23.5 3.5 13 A11.5 11.5 0 1 1 26.5 13 C26.5 23.5 15 38.5 15 38.5 Z"
        fill="#E8641F" stroke="#2B1608" stroke-width="2" stroke-linejoin="round" />
  <circle cx="15" cy="13" r="4.6" fill="#FFF8F0" />
</svg>`

/**
 * A FlightMeet pin as an `L.DivIcon`.
 *
 * @param selected - render the larger, glowing highlight variant (the marker
 *   the user has currently picked or opened).
 */
export function brandMarkerIcon(selected = false): L.DivIcon {
  const width = selected ? 38 : 30
  const height = selected ? 50 : 40
  return L.divIcon({
    html: PIN_SVG,
    className: selected ? 'fm-marker fm-marker--selected' : 'fm-marker',
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 8],
  })
}

/**
 * Cluster bubble factory for `leaflet.markercluster`. Returns a cream pill with
 * ink text and an orange ring (styled in map.css via the `.fm-cluster` class),
 * sized up as the cluster grows.
 */
export function brandClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count < 10 ? 34 : count < 50 ? 42 : 50
  return L.divIcon({
    html: `<span>${count}</span>`,
    className: 'fm-cluster',
    iconSize: L.point(size, size),
  })
}
