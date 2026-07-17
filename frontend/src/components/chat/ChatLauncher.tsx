import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChatCircleDotsIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { ChatPanel } from '@/components/chat/ChatPanel'

// Routes where the floating launcher would be redundant or in the way.
const HIDDEN_ON = ['/chat', '/login', '/register']

/**
 * Floating chat bubble, bottom-right on every app page. Opens the chat in a
 * popover so pilots never have to leave whatever they're looking at. Renders
 * nothing when logged out or on the routes in {@link HIDDEN_ON}. Polling only
 * runs while the popover is open, because the panel unmounts when it closes.
 */
export function ChatLauncher() {
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // Close whenever the route changes (e.g. clicking a link inside the panel).
  // Done during render via the previous-value pattern rather than an effect.
  const [seenPath, setSeenPath] = useState(location.pathname)
  if (location.pathname !== seenPath) {
    setSeenPath(location.pathname)
    if (open) setOpen(false)
  }

  // Close on Escape and on click outside, but let an open confirm dialog
  // (portaled to the body) handle its own dismissal first.
  useEffect(() => {
    if (!open) return

    const isInPortalUi = (target: Element | null) =>
      !!target?.closest(
        '[data-slot="alert-dialog-content"],[data-slot="alert-dialog-overlay"],[role="alertdialog"]',
      )

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      if (buttonRef.current?.contains(target)) return
      if (isInPortalUi(target)) return
      setOpen(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[data-slot="alert-dialog-content"]')) return
      setOpen(false)
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user || HIDDEN_ON.includes(location.pathname)) return null

  return (
    <div
      className="pointer-events-none fixed right-0 bottom-0 z-40 flex flex-col items-end gap-3 p-4"
      style={{
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chat"
          className="pointer-events-auto flex h-[min(34rem,calc(100dvh-6.5rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/95 text-card-foreground shadow-2xl ring-1 ring-foreground/5 backdrop-blur-md duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 motion-reduce:animate-none dark:ring-foreground/10"
        >
          <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <ChatCircleDotsIcon weight="fill" className="size-5 text-primary" />
              <span className="font-heading font-semibold">Chat</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <XIcon />
            </Button>
          </header>
          <div className="min-h-0 flex-1">
            <ChatPanel variant="popover" />
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-foreground/5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:translate-y-0 motion-reduce:transition-none"
      >
        {open ? (
          <XIcon className="size-6" />
        ) : (
          <ChatCircleDotsIcon weight="fill" className="size-6" />
        )}
      </button>
    </div>
  )
}
