import { useCallback, useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import type { UnlistenFn } from "@tauri-apps/api/event"
import type {
  GatewayEventEnvelope,
  OpenClawConnectionStatus,
} from "@/lib/openclaw-types"
import { useWorkDomainActions } from "@/stores"

export function useOpenClawConnection() {
  const { setOpenClawConnectionStatus, addGatewayEvent } = useWorkDomainActions()
  const statusUnlistenRef = useRef<UnlistenFn | null>(null)
  const gatewayUnlistenRef = useRef<UnlistenFn | null>(null)

  // Listen for connection status events from Rust
  useEffect(() => {
    const setup = async () => {
      statusUnlistenRef.current = await listen<OpenClawConnectionStatus>(
        "openclaw:connection-status",
        (event) => {
          const { connected, gatewayVersion, error } = event.payload
          setOpenClawConnectionStatus({
            status: connected
              ? "connected"
              : error
                ? "error"
              : "disconnected",
            gatewayVersion,
            error,
          })
        },
      )

      gatewayUnlistenRef.current = await listen<GatewayEventEnvelope>(
        "openclaw:gateway-event",
        (event) => {
          addGatewayEvent(event.payload)
        },
      )
    }
    setup()

    return () => {
      statusUnlistenRef.current?.()
      gatewayUnlistenRef.current?.()
    }
  }, [addGatewayEvent, setOpenClawConnectionStatus])

  const connect = useCallback(
    async (password?: string, token?: string) => {
      try {
        setOpenClawConnectionStatus({ status: "connecting" })

        const status = await invoke<OpenClawConnectionStatus>(
          "openclaw_connect",
          { password, token },
        )

        setOpenClawConnectionStatus({
          status: status.connected ? "connected" : "error",
          gatewayVersion: status.gatewayVersion,
          error: status.error,
        })

        return status.connected
      } catch (err) {
        setOpenClawConnectionStatus({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        })
        return false
      }
    },
    [setOpenClawConnectionStatus],
  )

  const disconnect = useCallback(async () => {
    try {
      await invoke("openclaw_disconnect")
      setOpenClawConnectionStatus({ status: "disconnected" })
      return true
    } catch (err) {
      setOpenClawConnectionStatus({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }, [setOpenClawConnectionStatus])

  const refreshConnectionStatus = useCallback(async () => {
    try {
      const status = await invoke<OpenClawConnectionStatus>(
        "openclaw_get_connection_status",
      )
      setOpenClawConnectionStatus({
        status: status.connected ? "connected" : "disconnected",
        gatewayVersion: status.gatewayVersion,
        error: status.error,
      })
      return status.connected
    } catch {
      return false
    }
  }, [setOpenClawConnectionStatus])

  return {
    connect,
    disconnect,
    refreshConnectionStatus,
  }
}
