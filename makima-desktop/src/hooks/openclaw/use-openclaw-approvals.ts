import { useCallback, useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type { OpenClawApprovalRequest } from "@/lib/openclaw-types"
import { useWorkDomainActions } from "@/stores"

export function useOpenClawApprovals() {
  const { addApproval, resolveApproval, setError } = useWorkDomainActions()
  const unlistenRef = useRef<UnlistenFn | null>(null)

  // Listen for approval requests from Rust
  useEffect(() => {
    const setup = async () => {
      unlistenRef.current = await listen<OpenClawApprovalRequest>(
        "openclaw:approval-request",
        (event) => {
          const req = event.payload

          addApproval({
            id: req.approvalId,
            runId: req.sessionKey,
            sessionId: req.sessionKey,
            action: {
              type: "command",
              description: req.description,
              payload: JSON.stringify(req.arguments),
              risk: req.risk,
            },
            status: "pending",
            createdAt: Date.now(),
          })
        },
      )
    }
    setup()

    return () => {
      unlistenRef.current?.()
    }
  }, [addApproval])

  const approve = useCallback(
    async (approvalId: string) => {
      try {
        await invoke("openclaw_resolve_approval", {
          approvalId,
          approved: true,
        })
        resolveApproval(approvalId, "approved")
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [resolveApproval, setError],
  )

  const reject = useCallback(
    async (approvalId: string, reason?: string) => {
      try {
        await invoke("openclaw_resolve_approval", {
          approvalId,
          approved: false,
          reason,
        })
        resolveApproval(approvalId, "rejected")
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [resolveApproval, setError],
  )

  return {
    approve,
    reject,
  }
}
