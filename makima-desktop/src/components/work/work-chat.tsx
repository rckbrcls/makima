import { useCallback, useEffect, useRef, useState } from "react"
import { Send, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WorkChatMessage } from "@/lib/openclaw-types"
import {
  useWorkChatMessages,
  useWorkIsAgentStreaming,
  useWorkActiveAgent,
  useWorkActiveSessionId,
} from "@/stores"
import { useOpenClawAgent } from "@/hooks/openclaw"

export function WorkChat() {
  const messages = useWorkChatMessages()
  const isStreaming = useWorkIsAgentStreaming()
  const activeAgent = useWorkActiveAgent()
  const activeSessionId = useWorkActiveSessionId()
  const { sendMessage } = useOpenClawAgent()

  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || !activeAgent || !activeSessionId || isStreaming) return

    setInput("")
    await sendMessage(activeAgent.id, activeSessionId, trimmed)
    inputRef.current?.focus()
  }, [input, activeAgent, activeSessionId, isStreaming, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && (
              <div className="flex items-center gap-2 pl-2">
                <div className="size-1.5 animate-pulse rounded-full bg-sky-500" />
                <span className="text-muted-foreground text-xs">
                  Agent is thinking...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeAgent
                ? `Message ${activeAgent.name}...`
                : "Select an agent to start"
            }
            disabled={!activeAgent || !activeSessionId || isStreaming}
            rows={1}
            className="bg-input text-foreground placeholder:text-muted-foreground flex-1 resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSend}
            disabled={
              !input.trim() ||
              !activeAgent ||
              !activeSessionId ||
              isStreaming
            }
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Chat Bubble
// ============================================================================

interface ChatBubbleProps {
  message: WorkChatMessage
}

function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user"
  const isTool = message.role === "tool"
  const isSystem = message.role === "system"

  return (
    <div
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2",
          isUser
            ? "glass-selected text-foreground"
            : isTool
              ? "glass-subtle border border-border"
              : isSystem
                ? "border border-rose-800 bg-rose-950 text-rose-300"
                : "glass text-foreground",
        )}
      >
        {isTool && message.toolName && (
          <div className="mb-1 flex items-center gap-1.5">
            <Wrench className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground text-xs font-medium">
              {message.toolName}
            </span>
          </div>
        )}
        <p
          className={cn(
            "whitespace-pre-wrap text-sm",
            isSystem && "text-rose-300",
          )}
        >
          {message.content}
        </p>
        {message.isStreaming && (
          <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-sky-500" />
        )}
      </div>
    </div>
  )
}
