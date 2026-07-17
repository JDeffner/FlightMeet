import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CaretDownIcon,
  ChatCircleDotsIcon,
  GlobeHemisphereWestIcon,
  PaperPlaneRightIcon,
  TrashIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ChatMessage, GroupSummary } from '@/lib/types'

const POLL_INTERVAL_MS = 3000

export interface ChatPanelProps {
  /**
   * 'page' = the full-height /chat layout (sidebar on desktop, collapsible
   * channel header on mobile) with the selected channel synced to the ?group=
   * URL param. 'popover' = the compact launcher panel with channel chips and
   * purely internal channel state (the URL is never touched).
   */
  variant: 'page' | 'popover'
  /** Initial channel for popover mode (ignored in page mode, which reads the URL). */
  initialGroupId?: number | null
}

/** Append `incoming` to `prev`, dropping ids we already have (poll vs. POST race). */
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set(prev.map((m) => m.id))
  const fresh = incoming.filter((m) => !seen.has(m.id))
  if (fresh.length === 0) return prev
  return [...prev, ...fresh].sort((a, b) => a.id - b.id)
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === new Date().toDateString()) return time
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

export function ChatPanel({ variant, initialGroupId = null }: ChatPanelProps) {
  const compact = variant === 'popover'
  const [searchParams, setSearchParams] = useSearchParams()

  // --- selected channel ------------------------------------------------------
  // Page mode is the source of truth in the URL; popover mode keeps it local.
  const [internalGroupId, setInternalGroupId] = useState<number | null>(initialGroupId)
  let groupId: number | null
  if (variant === 'page') {
    const groupParam = searchParams.get('group')
    const parsed = groupParam === null ? null : Number.parseInt(groupParam, 10)
    groupId = parsed !== null && Number.isFinite(parsed) ? parsed : null
  } else {
    groupId = internalGroupId
  }

  // --- channels (global + joined groups) ------------------------------------
  const [joinedGroups, setJoinedGroups] = useState<GroupSummary[] | null>(null)
  const [channelsOpen, setChannelsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<{ data: GroupSummary[] }>('/api/groups')
      .then((res) => {
        if (!cancelled) setJoinedGroups(res.data.filter((g) => g.joined))
      })
      .catch(() => {
        if (!cancelled) setJoinedGroups([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectChannel = (id: number | null) => {
    setChannelsOpen(false)
    setDraft('')
    if (variant === 'page') {
      setSearchParams(id === null ? {} : { group: String(id) })
    } else {
      setInternalGroupId(id)
    }
  }

  const currentGroup = groupId === null ? null : joinedGroups?.find((g) => g.id === groupId)
  const channelName = groupId === null ? 'All pilots' : (currentGroup?.name ?? 'Group chat')

  // --- messages + polling ----------------------------------------------------
  // Message and error state is keyed by the channel it belongs to, so switching
  // channels immediately shows the loading state without resetting anything
  // inside the effect body.
  const [msgState, setMsgState] = useState<{ channel: number | null; list: ChatMessage[] } | null>(
    null,
  )
  const [loadErrorState, setLoadErrorState] = useState<{
    channel: number | null
    message: string
  } | null>(null)
  const [sendErrorState, setSendErrorState] = useState<{
    channel: number | null
    message: string
  } | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const messages = msgState !== null && msgState.channel === groupId ? msgState.list : null
  const loadError =
    loadErrorState !== null && loadErrorState.channel === groupId ? loadErrorState.message : null
  const sendError =
    sendErrorState !== null && sendErrorState.channel === groupId ? sendErrorState.message : null

  const msgStateRef = useRef(msgState)
  const channelRef = useRef<number | null>(groupId)
  const listRef = useRef<HTMLDivElement | null>(null)
  const atBottomRef = useRef(true)

  useEffect(() => {
    msgStateRef.current = msgState
  }, [msgState])
  useEffect(() => {
    channelRef.current = groupId
  }, [groupId])

  useEffect(() => {
    let cancelled = false
    atBottomRef.current = true

    const path = (after?: number) => {
      const params = new URLSearchParams()
      if (groupId !== null) params.set('groupId', String(groupId))
      if (after !== undefined) params.set('after', String(after))
      const qs = params.toString()
      return `/api/chat/messages${qs ? `?${qs}` : ''}`
    }

    const initialLoad = async () => {
      try {
        const res = await api<{ data: ChatMessage[] }>(path())
        if (cancelled) return
        setMsgState({ channel: groupId, list: res.data })
      } catch (err) {
        if (cancelled) return
        setLoadErrorState({
          channel: groupId,
          message:
            err instanceof ApiError && err.status === 403
              ? 'You need to join this group before you can read its chat.'
              : 'Couldn’t load messages. Please try again in a moment.',
        })
      }
    }

    const poll = async () => {
      const current = msgStateRef.current
      // Skip until the initial load for *this* channel has finished.
      if (current === null || current.channel !== groupId) return
      const lastId = current.list.length > 0 ? current.list[current.list.length - 1].id : 0
      try {
        const res = await api<{ data: ChatMessage[] }>(path(lastId))
        if (cancelled || res.data.length === 0) return
        setMsgState((prev) =>
          prev !== null && prev.channel === groupId
            ? { channel: groupId, list: mergeMessages(prev.list, res.data) }
            : prev,
        )
      } catch {
        // transient network hiccup — the next poll retries
      }
    }

    void initialLoad()
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [groupId])

  // Keep the view pinned to the newest message unless the user scrolled up.
  useEffect(() => {
    const el = listRef.current
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  // --- sending ---------------------------------------------------------------
  const send = async () => {
    const body = draft.trim()
    if (!body || sending) return
    const channel = groupId
    setDraft('')
    setSendErrorState(null)
    setSending(true)
    try {
      const res = await api<{ message: ChatMessage }>('/api/chat/messages', {
        method: 'POST',
        body: channel === null ? { body } : { body, groupId: channel },
      })
      atBottomRef.current = true
      setMsgState((prev) =>
        prev !== null && prev.channel === channel
          ? { channel, list: mergeMessages(prev.list, [res.message]) }
          : prev,
      )
    } catch (err) {
      if (channelRef.current === channel) setDraft(body)
      setSendErrorState({
        channel,
        message: err instanceof ApiError ? err.message : 'Your message didn’t go out. Please try again.',
      })
    } finally {
      setSending(false)
    }
  }

  // --- deleting --------------------------------------------------------------
  const deleteMessage = async (id: number) => {
    const channel = groupId
    setDeletingId(id)
    setSendErrorState(null)
    try {
      await api<{ ok: boolean; id: number }>(`/api/chat/messages/${id}`, { method: 'DELETE' })
      setMsgState((prev) =>
        prev !== null && prev.channel === channel
          ? { channel, list: prev.list.filter((m) => m.id !== id) }
          : prev,
      )
    } catch (err) {
      setSendErrorState({
        channel,
        message:
          err instanceof ApiError ? err.message : 'Couldn’t delete that message. Please try again.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  // --- shared pieces ---------------------------------------------------------
  const messagesArea = (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className={cn('flex-1 overflow-y-auto', compact ? 'px-3 py-3' : 'px-4 py-4')}
    >
      {loadError ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <Alert variant="destructive" className="max-w-md">
            <WarningCircleIcon />
            <AlertTitle>{loadError}</AlertTitle>
          </Alert>
          {groupId !== null && (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link to={`/groups/${groupId}`} />}>
              View this group
            </Button>
          )}
        </div>
      ) : messages === null ? (
        <div className="flex h-full items-center justify-center">
          <Spinner className="size-6" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <ChatCircleDotsIcon className="size-10 text-muted-foreground/50" />
          <p className="font-heading font-medium">It&apos;s quiet up here</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Be the first to say hi — every great flying story starts somewhere.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              deleting={deletingId === message.id}
              onRequestDelete={setPendingDeleteId}
            />
          ))}
        </div>
      )}
    </div>
  )

  const composer = (
    <form onSubmit={handleSubmit} className={cn('border-t', compact ? 'p-2.5' : 'p-3')}>
      {sendError && (
        <Alert variant="destructive" className="mb-2">
          <WarningCircleIcon />
          <AlertTitle>{sendError}</AlertTitle>
        </Alert>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${channelName}…`}
          aria-label="Message"
          rows={1}
          maxLength={2000}
          disabled={loadError !== null}
          className="max-h-32 min-h-9 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || loadError !== null || draft.trim() === ''}
          aria-label="Send message"
        >
          {sending ? <Spinner /> : <PaperPlaneRightIcon weight="fill" />}
        </Button>
      </div>
      {!compact && (
        <p className="mt-1.5 px-1 text-xs text-muted-foreground">
          Enter to send · Shift+Enter for a new line
        </p>
      )}
    </form>
  )

  const deleteDialog = (
    <AlertDialog
      open={pendingDeleteId !== null}
      onOpenChange={(open) => {
        if (!open) setPendingDeleteId(null)
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this message?</AlertDialogTitle>
          <AlertDialogDescription>This can’t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              const id = pendingDeleteId
              setPendingDeleteId(null)
              if (id !== null) void deleteMessage(id)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // --- page variant ----------------------------------------------------------
  const channelList = (
    <nav className="flex flex-col gap-1 p-3">
      <ChannelButton
        active={groupId === null}
        onClick={() => selectChannel(null)}
        icon={<GlobeHemisphereWestIcon className="size-4 shrink-0" />}
        label="All pilots"
      />
      {joinedGroups === null ? (
        <div className="flex flex-col gap-2 px-3 py-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : joinedGroups.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Join a{' '}
          <Link to="/groups" className="underline underline-offset-2">
            group
          </Link>{' '}
          to unlock its channel.
        </p>
      ) : (
        joinedGroups.map((group) => (
          <ChannelButton
            key={group.id}
            active={groupId === group.id}
            onClick={() => selectChannel(group.id)}
            icon={<UsersThreeIcon className="size-4 shrink-0" />}
            label={group.name}
          />
        ))
      )}
    </nav>
  )

  if (compact) {
    return (
      <>
        <div className="flex h-full min-h-0 flex-col">
          {/* Channel chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ChannelChip
              active={groupId === null}
              onClick={() => selectChannel(null)}
              icon={<GlobeHemisphereWestIcon className="size-3.5 shrink-0" />}
              label="All pilots"
            />
            {joinedGroups === null ? (
              <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
            ) : (
              joinedGroups.map((group) => (
                <ChannelChip
                  key={group.id}
                  active={groupId === group.id}
                  onClick={() => selectChannel(group.id)}
                  icon={<UsersThreeIcon className="size-3.5 shrink-0" />}
                  label={group.name}
                />
              ))
            )}
          </div>
          {messagesArea}
          {composer}
        </div>
        {deleteDialog}
      </>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100svh-19rem)] min-h-[26rem] overflow-hidden rounded-3xl border bg-card shadow-xs">
        {/* Channel sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r bg-muted/30 md:flex">
          <p className="px-6 pt-5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Channels
          </p>
          {channelList}
        </aside>

        {/* Conversation */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Header + collapsible channel picker (mobile) */}
          <header className="border-b">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left md:pointer-events-none"
              onClick={() => setChannelsOpen((v) => !v)}
              aria-expanded={channelsOpen}
            >
              {groupId === null ? (
                <GlobeHemisphereWestIcon className="size-5 text-primary" />
              ) : (
                <UsersThreeIcon className="size-5 text-primary" />
              )}
              <span className="truncate font-heading font-semibold">{channelName}</span>
              <CaretDownIcon
                className={cn(
                  'ml-auto size-4 text-muted-foreground transition-transform md:hidden',
                  channelsOpen && 'rotate-180',
                )}
              />
            </button>
            {channelsOpen && <div className="border-t bg-muted/30 md:hidden">{channelList}</div>}
          </header>

          {messagesArea}
          {composer}
        </section>
      </div>
      {deleteDialog}
    </>
  )
}

function ChannelButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm transition-colors',
        active
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-foreground/80 hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

function ChannelChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-transparent bg-muted text-foreground/80 hover:bg-muted/70 hover:text-foreground',
      )}
    >
      {icon}
      <span className="max-w-32 truncate">{label}</span>
    </button>
  )
}

function MessageBubble({
  message,
  deleting,
  onRequestDelete,
}: {
  message: ChatMessage
  deleting: boolean
  onRequestDelete: (id: number) => void
}) {
  return (
    <div
      className={cn(
        'flex max-w-[85%] flex-col gap-0.5 sm:max-w-[70%]',
        message.mine ? 'items-end self-end' : 'items-start self-start',
      )}
    >
      <p className="flex items-baseline gap-2 px-1 text-xs text-muted-foreground">
        {!message.mine && <span className="font-medium text-foreground">{message.author.name}</span>}
        <span>{formatTime(message.createdAt)}</span>
      </p>
      <div className="group/bubble flex items-end gap-1">
        {message.mine && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Delete message"
            disabled={deleting}
            onClick={() => onRequestDelete(message.id)}
            className={cn(
              'shrink-0 self-center text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100 pointer-coarse:opacity-100',
              deleting && 'opacity-100',
            )}
          >
            {deleting ? <Spinner className="size-3" /> : <TrashIcon />}
          </Button>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap',
            message.mine
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-muted text-foreground',
          )}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}
