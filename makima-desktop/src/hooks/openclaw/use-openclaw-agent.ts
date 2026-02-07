import { useCallback, useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type {
  OpenClawAgentConfig,
  OpenClawAgentEvent,
} from "@/lib/openclaw-types"
import { useWorkDomainActions } from "@/stores"

export function useOpenClawAgent() {
  const {
    addChatMessage,
    updateChatMessage,
    setIsAgentStreaming,
    setAgents,
    setIsLoadingAgents,
    setError,
  } = useWorkDomainActions()

  const unlistenRef = useRef<UnlistenFn | null>(null)
  const streamingMessageRef = useRef<string | null>(null)

  // Listen for agent events from Rust
  useEffect(() => {
    const setup = async () => {
      unlistenRef.current = await listen<OpenClawAgentEvent>(
        "openclaw:agent-event",
        (event) => {
          const { eventType, data } = event.payload

          switch (eventType) {
            case "agent.chunk": {
              const content =
                (data.content as string) ?? (data.delta as string) ?? ""
              if (!content) break

              if (streamingMessageRef.current) {
                // Append to existing streaming message
                updateChatMessage(streamingMessageRef.current, {
                  content:
                    (data._accumulated as string | undefined) ?? content,
                  isStreaming: true,
                })
              } else {
                // Create new assistant message
                const msgId = `msg-${Date.now()}`
                streamingMessageRef.current = msgId
                setIsAgentStreaming(true)
                addChatMessage({
                  id: msgId,
                  role: "assistant",
                  content,
                  timestamp: Date.now(),
                  isStreaming: true,
                })
              }
              break
            }

            case "agent.message": {
              const content = (data.content as string) ?? ""
              const msgId = `msg-${Date.now()}`
              addChatMessage({
                id: msgId,
                role: "assistant",
                content,
                timestamp: Date.now(),
              })
              break
            }

            case "agent.tool_call": {
              const toolName = (data.toolName as string) ?? "unknown"
              const description =
                (data.description as string) ?? `Calling ${toolName}`
              const msgId = `tool-${Date.now()}`
              addChatMessage({
                id: msgId,
                role: "tool",
                content: description,
                timestamp: Date.now(),
                toolName,
              })
              break
            }

            case "agent.done": {
              if (streamingMessageRef.current) {
                updateChatMessage(streamingMessageRef.current, {
                  isStreaming: false,
                })
                streamingMessageRef.current = null
              }
              setIsAgentStreaming(false)
              break
            }

            case "agent.error": {
              if (streamingMessageRef.current) {
                updateChatMessage(streamingMessageRef.current, {
                  isStreaming: false,
                })
                streamingMessageRef.current = null
              }
              setIsAgentStreaming(false)

              const errorMsg =
                (data.error as string) ?? (data.message as string) ?? "Unknown error"
              addChatMessage({
                id: `err-${Date.now()}`,
                role: "system",
                content: `Error: ${errorMsg}`,
                timestamp: Date.now(),
              })
              break
            }
          }
        },
      )
    }
    setup()

    return () => {
      unlistenRef.current?.()
    }
  }, [addChatMessage, updateChatMessage, setIsAgentStreaming])

  const sendMessage = useCallback(
    async (agentId: string, sessionKey: string, message: string) => {
      try {
        // Add user message to chat
        addChatMessage({
          id: `user-${Date.now()}`,
          role: "user",
          content: message,
          timestamp: Date.now(),
        })

        await invoke("openclaw_send_message", {
          agentId,
          sessionKey,
          message,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        addChatMessage({
          id: `err-${Date.now()}`,
          role: "system",
          content: `Failed to send message: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        })
      }
    },
    [addChatMessage, setError],
  )

  const loadAgents = useCallback(async () => {
    try {
      setIsLoadingAgents(true)
      const agents = await invoke<Array<OpenClawAgentConfig>>(
        "openclaw_list_agents",
      )

      // Convert OpenClaw agent configs to Work domain agents
      setAgents(
        agents.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          config: {
            model: a.model,
            provider: a.provider,
            tools: a.tools,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoadingAgents(false)
    }
  }, [setAgents, setIsLoadingAgents, setError])

  return {
    sendMessage,
    loadAgents,
  }
}
