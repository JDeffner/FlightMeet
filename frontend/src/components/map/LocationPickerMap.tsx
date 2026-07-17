// Controlled map location picker for forms. Click to place the pin, drag it to
// fine-tune. Built on BaseMap and the brand marker. The meet create/edit form
// (a separate workstream) consumes this, so the props are documented below.
import type { LatLngExpression, LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet'
import { Marker, useMapEvents } from 'react-leaflet'
import { BaseMap } from './BaseMap'
import { brandMarkerIcon } from './markers'

export interface LatLngLiteral {
  lat: number
  lng: number
}

export interface LocationPickerMapProps {
  /** Current coordinate, or null when nothing is picked yet. */
  value: LatLngLiteral | null
  /** Called with the new coordinate on a map click or after a marker drag. */
  onChange: (value: LatLngLiteral) => void
  /** Fallback centre when `value` is null (default: central Germany). */
  center?: LatLngExpression
  /** Fallback zoom when `value` is null (default 5). Picked values zoom to >= 9. */
  zoom?: number
  /** Extra classes for the map wrapper (set height here, e.g. `h-[360px]`). */
  className?: string
}

/** Captures map clicks and reports the clicked coordinate. Renders nothing. */
function ClickCapture({ onPick }: { onPick: (value: LatLngLiteral) => void }) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

/**
 * A controlled picker: `value` drives the pin, `onChange` fires on click or
 * drag. Keep it controlled from form state so it stays in sync with number
 * inputs, geocoding results, etc.
 *
 * @example
 * const [pos, setPos] = useState<LatLngLiteral | null>(null)
 * <LocationPickerMap value={pos} onChange={setPos} className="h-[360px]" />
 */
export function LocationPickerMap({
  value,
  onChange,
  center = [50.5, 9.5],
  zoom = 5,
  className,
}: LocationPickerMapProps) {
  return (
    <BaseMap
      center={value ? [value.lat, value.lng] : center}
      zoom={value ? Math.max(zoom, 9) : zoom}
      className={className}
      ariaLabel="Pick a location by clicking or dragging the pin"
    >
      <ClickCapture onPick={onChange} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={brandMarkerIcon(true)}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target as LeafletMarker
              const position = marker.getLatLng()
              onChange({ lat: position.lat, lng: position.lng })
            },
          }}
        />
      )}
    </BaseMap>
  )
}
