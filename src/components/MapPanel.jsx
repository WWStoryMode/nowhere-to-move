import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { boundaries, areaByPolygon } from '../lib/data.js'
import { colourFor } from '../lib/palette.js'
import { n, pct } from '../lib/format.js'

// Plain Leaflet rather than react-leaflet: one fewer peer-dependency pin, and a
// 37-polygon static choropleth needs nothing react-leaflet provides.
// No tile layer - an online basemap would break the offline requirement, and a
// single-borough choropleth reads better without one.
export default function MapPanel({ view, dark, selected, onSelect }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const stateRef = useRef({ view, dark, selected })
  stateRef.current = { view, dark, selected }

  useEffect(() => {
    const map = L.map(elRef.current, {
      zoomControl: true,
      attributionControl: false,
      // fitBounds snaps to whole zoom levels by default, rounding down and
      // leaving up to 2x slack around a small borough. Fractional zoom fills it.
      zoomSnap: 0,
      zoomDelta: 0.5,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      dragging: true,
    })
    mapRef.current = map

    const layer = L.geoJSON(boundaries, {
      style: () => ({}),
      onEachFeature: (feature, lyr) => {
        const area = areaByPolygon.get(feature.properties.MSOA21CD)
        lyr.on({
          click: () => onSelect(area.code),
          mouseover: (e) => {
            e.target.setStyle({ weight: 2.5, color: dark ? '#ffffff' : '#0b0b0b' })
            e.target.bringToFront()
          },
          mouseout: (e) => restyle(e.target, feature),
        })
        // Both count and rate, always - a tooltip showing only one could be
        // screenshotted into the opposite claim.
        lyr.bindTooltip(
          `<strong>${area.name}</strong><br/>` +
          `Overcrowded: ${n(area.oc11)} → ${n(area.oc21)} ` +
          `(${area.countChange > 0 ? '+' : ''}${area.countChange})<br/>` +
          `Rate: ${pct(area.rate11)} → ${pct(area.rate21)} ` +
          `(${area.rateChange > 0 ? '+' : ''}${area.rateChange.toFixed(1)}pp)<br/>` +
          `Households: ${n(area.tot11)} → ${n(area.tot21)}`,
          { sticky: true, className: 'map-tip' }
        )
      },
    }).addTo(map)

    layerRef.current = layer

    // Leaflet caches the container size at init, which can be stale before
    // layout settles - so measure again on every resize and refit until the
    // user takes over the viewport themselves.
    const bounds = layer.getBounds()
    let userMoved = false
    const fit = () => {
      map.invalidateSize(false)
      if (!userMoved) map.fitBounds(bounds, { padding: [10, 10] })
    }
    map.whenReady(fit)
    requestAnimationFrame(fit)
    map.on('zoomstart dragstart', () => { userMoved = true })

    const ro = new ResizeObserver(fit)
    ro.observe(elRef.current)
    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function restyle(lyr, feature) {
    const { view: v, dark: d, selected: sel } = stateRef.current
    const area = areaByPolygon.get(feature.properties.MSOA21CD)
    const fill = colourFor(v, area, d)
    const isSel = sel === area.code
    lyr.setStyle({
      fillColor: fill || 'transparent',
      fillOpacity: fill ? 0.92 : 0,
      color: isSel ? (d ? '#ffffff' : '#0b0b0b') : d ? '#1a1a19' : '#fcfcfb',
      weight: isSel ? 3 : 1,
      opacity: 1,
    })
    if (isSel) lyr.bringToFront()
  }

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.eachLayer((lyr) => restyle(lyr, lyr.feature))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dark, selected])

  return <div className="map" ref={elRef} role="img" aria-label={`Map of Lewisham MSOAs coloured by ${view.label}. A sortable table of the same figures follows below.`} />
}
