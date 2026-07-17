// Clustering layer. react-leaflet has no first-party clustering, so this is a
// thin wrapper around the leaflet.markercluster plugin: it creates one
// L.markerClusterGroup on mount, syncs markers from `items` whenever they
// change, and cleans up on unmount. Drop it inside a BaseMap as a child.
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { brandClusterIcon, brandMarkerIcon } from './markers'

export interface ClusterMarkerItem {
  /** Stable identity for the point (used by callers to correlate clicks). */
  id: string | number
  lat: number
  lng: number
  /** Render the highlighted marker variant. */
  selected?: boolean
  /** Optional popup content as an HTML string (already escaped by the caller). */
  popup?: string
  /** Fired when this marker (once unclustered) is clicked. */
  onClick?: () => void
}

export interface MarkerClusterLayerProps {
  items: ClusterMarkerItem[]
  /** Max radius in px a cluster covers from its centre (default 48). */
  maxClusterRadius?: number
}

/**
 * Renders `items` as brand-styled, clustered markers. Nothing is drawn in React
 * itself (returns null); the plugin owns the DOM inside the Leaflet panes.
 */
export function MarkerClusterLayer({ items, maxClusterRadius = 48 }: MarkerClusterLayerProps) {
  const map = useMap()
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)

  // Keep the latest radius in a ref so the group's lifecycle stays tied to the
  // map alone (the group is created once, not rebuilt on every prop change).
  const radiusRef = useRef(maxClusterRadius)
  useEffect(() => {
    radiusRef.current = maxClusterRadius
  }, [maxClusterRadius])

  // Create the cluster group once, tear it down on unmount.
  useEffect(() => {
    const group = L.markerClusterGroup({
      iconCreateFunction: brandClusterIcon,
      showCoverageOnHover: false,
      maxClusterRadius: radiusRef.current,
      spiderfyOnMaxZoom: true,
    })
    groupRef.current = group
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
      groupRef.current = null
    }
  }, [map])

  // Sync markers whenever the items change.
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    for (const item of items) {
      const marker = L.marker([item.lat, item.lng], {
        icon: brandMarkerIcon(item.selected),
      })
      if (item.onClick) marker.on('click', item.onClick)
      if (item.popup) marker.bindPopup(item.popup)
      group.addLayer(marker)
    }
  }, [items])

  return null
}
