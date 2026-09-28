import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { STORAGE_KEY } from './api'

export function PreviewTools() {
  const { user, login } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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

  async function tryAccount(account: string) {
    setBusy(true)
    setError('')
    try {
      await login(account, 'demo1234', true)
      // Refresh page data that was loaded for the previous demo identity.
      window.location.reload()
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load the demo account.') }
    finally { setBusy(false) }
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); window.location.reload() }
    catch { setError('The browser could not reset this preview. Check its site storage settings.') }
  }

  return (
    <aside className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-6.5rem)] rounded-2xl border border-border bg-background/95 p-3 text-xs text-foreground shadow-lg backdrop-blur-md sm:max-w-sm" aria-label="Preview controls">
      <details>
        <summary className="cursor-pointer font-semibold">Interactive preview · sample data</summary>
        <p className="mt-2 max-w-72">Changes stay in this browser. Use made-up details. Passwords are not checked or saved. Chat is not shared with other visitors.</p>
        <p className="mt-2 max-w-72">Weather is simulated. Do not use it for flight planning. Search Trier, Kandel, Brauneck, Zeltingen, or Freiburg.</p>
        <p className="mt-2">Log in with <strong>demo</strong> or <strong>admin</strong> and any made-up password.</p>
      </details>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button className="font-medium underline underline-offset-2 disabled:opacity-50" disabled={busy} onClick={() => void tryAccount('demo')}>Try as pilot</button>
        <button className="font-medium underline underline-offset-2 disabled:opacity-50" disabled={busy} onClick={() => void tryAccount('admin')}>Try as admin</button>
        <button className="underline underline-offset-2" onClick={reset}>Reset demo</button>
      </div>
      <p className="mt-2 text-muted-foreground">{user ? `Signed in as ${user.username}. ` : ''}Sample weather, not a flight forecast.</p>
      {error && <p role="alert" className="mt-2 text-destructive">{error}</p>}
    </aside>
  )
}
