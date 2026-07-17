import { ChatPanel } from '@/components/chat/ChatPanel'

export function ChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-1 text-muted-foreground">
          Talk shop with every pilot on FlightMeet, or keep it local in your group channels.
        </p>
      </div>
      <ChatPanel variant="page" />
    </div>
  )
}
