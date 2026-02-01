import { useState, useEffect, useRef, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Square,
  Terminal,
  ArrowDown,
  Send,
  Cpu,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Action,
  AgentEvent,
  Session,
  AgentQuestion,
} from "./types"
import { ActionMessage, EventMessage } from "./session-chat-items"

// ============================================================================
// Types
// ============================================================================

type TimelineItem =
  | { type: "action"; data: Action; date: Date }
  | { type: "event"; data: AgentEvent; date: Date }
  | { type: "question"; data: AgentQuestion; date: Date }

// ============================================================================
// Question Options Component
// ============================================================================

interface QuestionOptionsProps {
  question: AgentQuestion
  onAnswer: (questionId: string, answer: string | string[]) => void
}

function QuestionOptions({ question, onAnswer }: QuestionOptionsProps) {
  const [selected, setSelected] = useState<string | string[]>(
    question.multiSelect ? [] : ""
  )

  const handleSelect = (value: string) => {
    if (question.multiSelect) {
      setSelected((prev) => {
        const arr = prev as string[]
        return arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value]
      })
    } else {
      setSelected(value)
    }
  }

  const handleSubmit = () => {
    if (question.multiSelect) {
      if ((selected as string[]).length > 0) {
        onAnswer(question.id, selected)
      }
    } else if (selected) {
      onAnswer(question.id, selected as string)
    }
  }

  const isSelected = (value: string) => {
    if (question.multiSelect) {
      return (selected as string[]).includes(value)
    }
    return selected === value
  }

  if (question.answered) {
    const answerLabels = question.options
      ?.filter((opt) =>
        Array.isArray(question.answer)
          ? question.answer.includes(opt.value)
          : question.answer === opt.value
      )
      .map((opt) => opt.label)
      .join(", ")

    return (
      <div className="flex justify-end px-4 py-2">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg rounded-tr-none max-w-[80%]">
          <p className="text-sm">{answerLabels || question.answer}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-3">
      <div className="bg-muted/30 border border-border rounded-lg p-4 max-w-md">
        <p className="text-sm font-medium mb-3">{question.question}</p>

        <div className="space-y-2">
          {question.options?.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-md border transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected(option.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    isSelected(option.value)
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected(option.value) && (
                    <Check className="size-2.5 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{option.label}</p>
                  {option.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              question.multiSelect
                ? (selected as string[]).length === 0
                : !selected
            }
            className="flex-1"
          >
            Confirm
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Or type a custom response below
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface SessionPanelProps {
  session: Session
  actions: Action[]
  events: AgentEvent[]
  questions?: AgentQuestion[]
  agentName?: string
  onEndSession?: (success: boolean) => void
  onSendMessage?: (message: string) => void
  onAnswerQuestion?: (questionId: string, answer: string | string[]) => void
  isLoading?: boolean
}

export function SessionPanel({
  session,
  actions,
  events,
  questions = [],
  agentName = "Agent",
  onEndSession,
  onSendMessage,
  onAnswerQuestion,
  isLoading,
}: SessionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [message, setMessage] = useState("")

  const isActive = session.state === "active"

  // Combine and sort items for the timeline
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [
      ...actions.map((a) => ({
        type: "action" as const,
        data: a,
        date: new Date(a.createdAt),
      })),
      ...events.map((e) => ({
        type: "event" as const,
        data: e,
        date: new Date(e.createdAt),
      })),
      ...questions.map((q) => ({
        type: "question" as const,
        data: q,
        date: new Date(q.createdAt),
      })),
    ]
    return items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [actions, events, questions])

  // Find unanswered question
  const pendingQuestion = questions.find((q) => !q.answered)

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [timelineItems, autoScroll])

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
    onSendMessage(message.trim())
    setMessage("")
    setAutoScroll(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAnswerQuestion = (questionId: string, answer: string | string[]) => {
    onAnswerQuestion?.(questionId, answer)
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden border-border">
      {/* Minimal Header */}
      <div className="flex-none px-4 py-2.5 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Cpu className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{agentName}</p>
          </div>
          {isActive && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-green-500/30 text-green-500"
            >
              <span className="size-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
              Active
            </Badge>
          )}
        </div>

        {isActive && onEndSession && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onEndSession(false)}
          >
            <Square className="size-3 mr-1 fill-current" />
            Stop
          </Button>
        )}
      </div>

      {/* Goal Banner */}
      <div className="flex-none px-4 py-2 bg-muted/30 border-b border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Goal:</span> {session.goal}
        </p>
      </div>

      {/* Chat Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 bg-background"
      >
        {timelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Terminal className="size-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              Session started
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {agentName} is analyzing your request...
            </p>
          </div>
        ) : (
          <div className="flex flex-col py-2">
            {timelineItems.map((item) => {
              if (item.type === "action") {
                return <ActionMessage key={item.data.id} action={item.data} />
              }
              if (item.type === "event") {
                return <EventMessage key={item.data.id} event={item.data} />
              }
              if (item.type === "question") {
                return (
                  <QuestionOptions
                    key={item.data.id}
                    question={item.data}
                    onAnswer={handleAnswerQuestion}
                  />
                )
              }
              return null
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 px-4 py-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="size-4 text-muted-foreground animate-spin" />
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground">
                    {agentName} is working...
                  </span>
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>
        )}

        {/* Scroll to bottom button */}
        {!autoScroll && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-20 right-6 rounded-full shadow-lg size-8 bg-background"
            onClick={() => {
              setAutoScroll(true)
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              })
            }}
          >
            <ArrowDown className="size-4" />
          </Button>
        )}
      </div>

      {/* Input Area - Always visible when active */}
      {isActive && (
        <div className="flex-none p-3 border-t border-border bg-card">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                pendingQuestion
                  ? "Type a custom response or select an option above..."
                  : "Type a message..."
              }
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              className="size-[44px] shrink-0"
              disabled={!message.trim() || isLoading}
              onClick={handleSendMessage}
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}

      {/* Completed/Failed state */}
      {!isActive && (
        <div className="flex-none p-3 border-t border-border bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            Session {session.state === "done" ? "completed" : "ended"} at{" "}
            {new Date(session.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </Card>
  )
}
