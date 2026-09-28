import { useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { STORAGE_KEY } from './api'
import './overlay.js'
import './demo.css'
import './PreviewTools.css'
import type { DemoPanelHandle } from './overlay'

export function PreviewTools() {
  const { user, loading, isAdmin, login, logout } = useAuth()
  const panel = useRef<DemoPanelHandle | null>(null)
  const role = loading ? null : !user ? 'guest' : isAdmin ? 'admin' : 'pilot'

  useEffect(() => {
    const controls = window.DemoPanel.mount({
      project: 'FlightMeet',
      homeUrl: 'https://jdeffner.com',
      roles: [{ id: 'guest', label: 'Guest' }, { id: 'pilot', label: 'Pilot' }, { id: 'admin', label: 'Admin' }],
      help: 'Switch roles to explore. Changes and chat stay in this browser. Reset restores the sample data. Weather is simulated, not for flight planning.',
      async onRole(nextRole) {
        const path = window.location.hash.slice(1).split('?')[0]
        const adminPage = path.startsWith('/admin/')
        const accountPage = ['/profile', '/chat', '/meets/new'].includes(path) || /^\/meets\/[^/]+\/edit$/.test(path)
        if (nextRole === 'guest') await logout()
        else await login(nextRole === 'admin' ? 'admin' : 'demo', 'demo1234', true)
        if ((nextRole !== 'admin' && adminPage) || (nextRole === 'guest' && accountPage) || ['/login', '/register'].includes(path)) {
          window.location.hash = '#/meets'
        }
        // Reload data for the chosen identity while preserving local edits.
        window.location.reload()
      },
      onReset() {
        localStorage.removeItem(STORAGE_KEY)
        window.location.assign(import.meta.env.BASE_URL)
      },
    })
    panel.current = controls
    return () => { controls.destroy(); panel.current = null }
  }, [login, logout])

  useEffect(() => { panel.current?.setRole(role) }, [role])

  useEffect(() => {
    // Plain section anchors must scroll without replacing the hash-router route.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a[href^="#"]')
      const href = anchor?.getAttribute('href')
      if (!href || href.startsWith('#/') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
      const target = document.getElementById(href.slice(1))
      if (target) {
        event.preventDefault()
        target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
