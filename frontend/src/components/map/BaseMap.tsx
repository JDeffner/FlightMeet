// Shared Leaflet map wrapper. Every FlightMeet map builds on this: it mounts a
// react-leaflet MapContainer with OpenStreetMap tiles, pulls in the Leaflet and
// brand stylesheets, and clips the whole thing into a rounded, warm-shadowed
// surface. Reused by the Weather page and (via LocationPickerMap) the meet form.
import 'leaflet/dist/leaflet.css'
import './map.css'
import type { CSSProperties, ReactNode, Ref } from 'react'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import { MapContainer, TileLayer } from 'react-leaflet'
import { cn } from '@/lib/utils'

export interface BaseMapProps {
  /** Initial map centre as [latitude, longitude]. */
  center: LatLngExpression
  /** Initial zoom level. */
  zoom: number
  /** Extra classes for the wrapper. Give the map its height here (e.g. `h-[420px]`). */
  className?: string
  style?: CSSProperties
  /** Layers, markers and event helpers rendered inside the map. */
  children?: ReactNode
  /**
   * Grab the underlying Leaflet map instance (for `flyTo`, `getZoom`, etc.).
   * Forwarded straight to MapContainer's `ref`, so it resolves once the map is
   * ready. Example: `const map = useRef<LeafletMap|null>(null)` then
   * `map.current?.flyTo([lat, lng], 9)`.
   */
  mapRef?: Ref<LeafletMap>
  /** Toggle scroll-wheel zoom (default on). */
  scrollWheelZoom?: boolean
  /** Accessible label for the map region. */
  ariaLabel?: string
}

/**
 * OpenStreetMap-backed map surface with the FlightMeet chrome. Pass markers,
 * a {@link MarkerClusterLayer}, or event helpers as children.
 */
export function BaseMap({
  center,
  zoom,
  className,
  style,
  children,
  mapRef,
  scrollWheelZoom = true,
  ariaLabel,
}: BaseMapProps) {
  return (
    <div
      className={cn(
        'fm-map relative isolate h-[420px] w-full overflow-hidden rounded-3xl shadow-md ring-1 ring-foreground/10',
        className,
      )}
      style={style}
      aria-label={ariaLabel}
    >
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {children}
      </MapContainer>
    </div>
  )
}
