import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import BedroomMix from './components/BedroomMix.jsx'
import ViewToggle from './components/ViewToggle.jsx'
import MapPanel from './components/MapPanel.jsx'
import Legend from './components/Legend.jsx'
import AreaPanel from './components/AreaPanel.jsx'
import HouseholdsChart from './components/HouseholdsChart.jsx'
import TableView from './components/TableView.jsx'
import LimitationsBox from './components/LimitationsBox.jsx'
import Footer from './components/Footer.jsx'
import { VIEWS } from './lib/palette.js'
import { areas } from './lib/data.js'

function useDarkMode() {
  const [dark, setDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  )
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = (e) => setDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

// Deep-link the current view and area into the hash so a specific area's
// figures can be shared as a link. Works offline; no router needed.
function readHash() {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const view = p.get('view')
  const area = p.get('area')
  return {
    viewId: VIEWS[view] ? view : 'countChange',
    selectedCode: areas.some((a) => a.code === area) ? area : null,
  }
}

export default function App() {
  const initial = readHash()
  const [viewId, setViewId] = useState(initial.viewId)
  const [selectedCode, setSelectedCode] = useState(initial.selectedCode)
  const dark = useDarkMode()
  const mapSectionRef = useRef(null)

  useEffect(() => {
    const p = new URLSearchParams()
    if (viewId !== 'countChange') p.set('view', viewId)
    if (selectedCode) p.set('area', selectedCode)
    const h = p.toString()
    const next = `${window.location.pathname}${window.location.search}${h ? '#' + h : ''}`
    window.history.replaceState(null, '', next)
  }, [viewId, selectedCode])

  useEffect(() => {
    const on = () => {
      const s = readHash()
      setViewId(s.viewId)
      setSelectedCode(s.selectedCode)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const view = VIEWS[viewId]
  const selected = useMemo(
    () => areas.find((a) => a.code === selectedCode) || null,
    [selectedCode]
  )

  function selectFromTable(code) {
    setSelectedCode(code)
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app">
      <Header />

      <BedroomMix dark={dark} />

      <section className="section section--map" ref={mapSectionRef}>
        <div className="map-head">
          <h2>Overcrowding by area</h2>
          <ViewToggle value={viewId} onChange={setViewId} />
        </div>

        <div className="map-layout">
          <div className="map-col">
            <MapPanel view={view} dark={dark} selected={selectedCode} onSelect={setSelectedCode} />
            <Legend view={view} dark={dark} />
          </div>
          <AreaPanel area={selected} />
        </div>
      </section>

      <HouseholdsChart />
      <TableView onSelect={selectFromTable} />
      <LimitationsBox />
      <Footer />
    </div>
  )
}
