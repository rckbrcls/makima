import { useState, useEffect, useRef, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Square,
  Terminal,
  XCircle,
  ArrowDown,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Action,
  AgentEvent,
  Session,
} from "./types"
import { getStatusColor } from "./types"
import { ActionMessage, EventMessage } from "./session-chat-items"

// ============================================================================
// Types
// ============================================================================

type TimelineItem =
  | { type: "action"; data: Action; date: Date }
  | { type: "event"; data: AgentEvent; date: Date }

// ============================================================================
// Main Component
// ============================================================================

interface SessionPanelProps {
  session: Session
  actions: Action[]
  events: AgentEvent[]
  onEndSession?: (success: boolean) => void
  onSendMessage?: (message: string) => void
  isLoading?: boolean
}

export function SessionPanel({
  session,
  actions,
  events,
  onEndSession,
  onSendMessage,
  isLoading,
}: SessionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [message, setMessage] = useState("")

  const isActive = session.state === "active"
  const pendingActions = actions.filter((a) => a.status === "pending" || a.status === "blocked")
  const completedActions = actions.filter((a) => a.status === "done")
  const failedActions = actions.filter((a) => a.status === "failed" || a.status === "rejected")

  // Combine and sort items for the timeline
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [
      ...actions.map((a) => ({ type: "action" as const, data: a, date: new Date(a.createdAt) })),
      ...events.map((e) => ({ type: "event" as const, data: e, date: new Date(e.createdAt) })),
    ]
    return items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [actions, events])

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollElement = scrollRef.current
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [timelineItems, autoScroll])

  // Handle manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      if (autoScroll !== isAtBottom) {
        setAutoScroll(isAtBottom)
      }
    }
  }

  const handleSendMessage = () => {
    if (!message.trim() || !onSendMessage) return
    onSendMessage(message)
    setMessage("")
    setAutoScroll(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="h-full flex flex-col shadow-none border-0 bg-transparent">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Play className="size-3.5 text-primary" />
              Session {session.id.slice(0, 8)}
            </h3>
            <Badge
              variant="outline"
              className={cn("text-[0.6rem] uppercase h-5", getStatusColor(session.state))}
            >
              {session.state === "active" ? (
                <Loader2 className="size-3 mr-1 animate-spin" />
              ) : session.state === "done" ? (
                <CheckCircle2 className="size-3 mr-1" />
              ) : (
                <XCircle className="size-3 mr-1" />
              )}
              {session.state}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate max-w-[300px]" title={session.goal}>
            {session.goal}
          </p>
        </div>

        {/* Mini Stats */}
        <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground bg-muted/30 px-2 py-1 rounded-full border">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-green-500" />
            {completedActions.length}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="flex items-center gap-1.5">
            <Clock className="size-3 text-yellow-500" />
            {pendingActions.length}
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="flex items-center gap-1.5">
            <XCircle className="size-3 text-destructive" />
            {failedActions.length}
          </span>
        </div>
      </div>

      {/* Chat Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 bg-background/20 relative"
      >
        {timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
            <Terminal className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Session initialized</p>
            <p className="text-xs text-muted-foreground mt-1">Waiting for agent activity...</p>
          </div>
        ) : (
          <div className="flex flex-col py-4">
            {/* Initial System Message */}
            <div className="px-4 py-2 flex justify-center mb-4">
              <div className="text-[0.65rem] text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border">
                Session started at {new Date(session.createdAt).toLocaleString()}
              </div>
            </div>

            {timelineItems.map((item, index) => {
              // Add a simple date separator if day changes (unlikely for single session but good practice)
              const prevItem = timelineItems[index - 1]
              const showDateSeparator = prevItem && item.date.toDateString() !== prevItem.date.toDateString()

              return (
                <div key={`${item.type}-${item.data.id}`}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="text-xs text-muted-foreground bg-background px-2">
                        {item.date.toDateString()}
                      </div>
                    </div>
                  )}

                  {item.type === 'action' ? (
                    <ActionMessage action={item.data} />
                  ) : (
                    <EventMessage event={item.data} />
                  )}
                </div>
              )
            })}

            {/* Scroll Anchor/padding */}
            <div className="h-4" />
          </div>
        )}

        {/* Scroll to bottom button */}
        {!autoScroll && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-md size-8 bg-background/80 backdrop-blur hover:bg-background transition-all animate-in fade-in zoom-in duration-200"
            onClick={() => {
              setAutoScroll(true)
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
            }}
          >
            <ArrowDown className="size-4" />
          </Button>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex-none p-3 border-t bg-background/50 backdrop-blur-sm flex flex-col gap-3">
        {/* Input Area */}
        {isActive && onSendMessage && (
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message agent..."
              className="min-h-[80px] pr-12 resize-none bg-background/80"
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 size-8"
              disabled={!message.trim() || isLoading}
              onClick={handleSendMessage}
            >
              <Send className="size-4" />
            </Button>
          </div>
        )}

        {isActive && onEndSession && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-600 h-8 text-xs"
              onClick={() => onEndSession(true)}
              disabled={isLoading}
            >
              <CheckCircle2 className="size-3.5 mr-2" />
              Complete Session
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive h-8 text-xs"
              onClick={() => onEndSession(false)}
              disabled={isLoading}
            >
              <Square className="size-3.5 mr-2 fill-current" />
              Stop Session
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
