import { useCallback, useEffect, useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useSupabaseConfig } from "@/stores"
import type {
  OpenClawAgentEvent,
  OpenClawApprovalRequest,
} from "@/lib/openclaw-types"

export type RelayStatus =
  | "idle"
  | "creating"
  | "waiting_pair"
  | "paired"
  | "active"
  | "error"

export interface RelayState {
  status: RelayStatus
  sessionId: string | null
  pairingCode: string | null
  error: string | null
}

export function useSupabaseRelay() {
  const config = useSupabaseConfig()
  const [relay, setRelay] = useState<RelayState>({
    status: "idle",
    sessionId: null,
    pairingCode: null,
    error: null,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const agentUnlistenRef = useRef<UnlistenFn | null>(null)
  const approvalUnlistenRef = useRef<UnlistenFn | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    channelRef.current?.unsubscribe()
    channelRef.current = null
    agentUnlistenRef.current?.()
    agentUnlistenRef.current = null
    approvalUnlistenRef.current?.()
    approvalUnlistenRef.current = null
    sessionIdRef.current = null
  }, [])

  const startRelay = useCallback(async () => {
    if (!config.enabled || !config.url || !config.anonKey) {
      setRelay((prev) => ({
        ...prev,
        status: "error",
        error: "Supabase not configured",
      }))
      return
    }

    setRelay({
      status: "creating",
      sessionId: null,
      pairingCode: null,
      error: null,
    })

    try {
      const client = getSupabaseClient(config.url, config.anonKey)

      // Get current session for auth
      const {
        data: { session },
      } = await client.auth.getSession()
      if (!session) {
        setRelay({
          status: "error",
          sessionId: null,
          pairingCode: null,
          error: "Not authenticated with Supabase",
        })
        return
      }

      // Call relay-connect Edge Function
      const { data, error } = await client.functions.invoke("relay-connect", {
        body: { desktopName: navigator.userAgent },
      })

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to create relay session")
      }

      const { sessionId, pairingCode } = data as {
        sessionId: string
        pairingCode: string
      }

      sessionIdRef.current = sessionId

      // Subscribe to Realtime channel for this session
      const channel = client.channel(`relay:${sessionId}`)

      // Listen for mobile_to_desktop messages via postgres_changes
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "relay_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const msg = payload.new as {
            direction: string
            message_type: string
            payload: Record<string, unknown>
          }

          if (msg.direction !== "mobile_to_desktop") return

          switch (msg.message_type) {
            case "user_message": {
              const content = msg.payload.content as string
              const agentId = msg.payload.agentId as string | undefined
              const sessionKey = msg.payload.sessionKey as string | undefined

              if (content && agentId && sessionKey) {
                invoke("openclaw_send_message", {
                  agentId,
                  sessionKey,
                  message: content,
                }).catch((err) =>
                  console.error("Failed to forward mobile message:", err),
                )
              }
              break
            }

            case "approval_response": {
              const approvalId = msg.payload.approvalId as string
              const approved = msg.payload.approved as boolean
              const reason = msg.payload.reason as string | undefined

              if (approvalId) {
                invoke("openclaw_resolve_approval", {
                  approvalId,
                  approved,
                  reason,
                }).catch((err) =>
                  console.error("Failed to forward approval response:", err),
                )
              }
              break
            }
          }
        },
      )

      // Listen for session status changes (mobile pairing)
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "relay_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const session = payload.new as { status: string }
          if (session.status === "paired") {
            setRelay((prev) => ({ ...prev, status: "paired" }))
          } else if (session.status === "active") {
            setRelay((prev) => ({ ...prev, status: "active" }))
          } else if (session.status === "disconnected") {
            setRelay((prev) => ({
              ...prev,
              status: "idle",
              pairingCode: null,
            }))
            cleanup()
          }
        },
      )

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRelay({
            status: "waiting_pair",
            sessionId,
            pairingCode,
            error: null,
          })
        }
      })

      channelRef.current = channel

      // Forward OpenClaw agent events to Supabase
      agentUnlistenRef.current = await listen<OpenClawAgentEvent>(
        "openclaw:agent-event",
        (event) => {
          const sid = sessionIdRef.current
          if (!sid) return

          const { eventType, data: eventData } = event.payload

          if (eventType === "agent.chunk") {
            // Use Broadcast for streaming chunks (no persistence)
            channel.send({
              type: "broadcast",
              event: "agent_chunk",
              payload: {
                content:
                  (eventData.content as string) ??
                  (eventData.delta as string) ??
                  "",
              },
            })
          } else {
            // Use DB INSERT for durable messages
            const typeMap: Record<string, string> = {
              "agent.message": "agent_message",
              "agent.tool_call": "agent_tool_call",
              "agent.done": "agent_done",
              "agent.error": "agent_error",
            }
            const messageType = typeMap[eventType]
            if (messageType) {
              client
                .from("relay_messages")
                .insert({
                  session_id: sid,
                  direction: "desktop_to_mobile",
                  message_type: messageType,
                  payload: eventData,
                })
                .then(({ error: insertErr }) => {
                  if (insertErr)
                    console.error("Failed to relay event:", insertErr)
                })
            }
          }
        },
      )

      // Forward approval requests to Supabase (triggers push notification)
      approvalUnlistenRef.current = await listen<OpenClawApprovalRequest>(
        "openclaw:approval-request",
        (event) => {
          const sid = sessionIdRef.current
          if (!sid) return

          const req = event.payload
          client
            .from("relay_messages")
            .insert({
              session_id: sid,
              direction: "desktop_to_mobile",
              message_type: "approval_request",
              payload: {
                approvalId: req.approvalId,
                sessionKey: req.sessionKey,
                toolName: req.toolName,
                arguments: req.arguments,
                risk: req.risk,
                description: req.description,
              },
            })
            .then(({ error: insertErr }) => {
              if (insertErr)
                console.error("Failed to relay approval request:", insertErr)
            })
        },
      )
    } catch (err) {
      setRelay({
        status: "error",
        sessionId: null,
        pairingCode: null,
        error: err instanceof Error ? err.message : String(err),
      })
      cleanup()
    }
  }, [config, cleanup])

  const stopRelay = useCallback(async () => {
    const sid = sessionIdRef.current
    if (sid && config.url && config.anonKey) {
      try {
        const client = getSupabaseClient(config.url, config.anonKey)
        await client
          .from("relay_sessions")
          .update({ status: "disconnected" })
          .eq("id", sid)
      } catch {
        // Best effort
      }
    }

    cleanup()
    setRelay({
      status: "idle",
      sessionId: null,
      pairingCode: null,
      error: null,
    })
  }, [config, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return { relay, startRelay, stopRelay }
}
