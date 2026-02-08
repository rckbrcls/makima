import { useCallback, useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import type { UnlistenFn } from "@tauri-apps/api/event"
import type { OpenClawApprovalRequest } from "@/lib/openclaw-types"
import type { Approval } from "@/lib/work-types"
import { useWorkDomainActions } from "@/stores"

function toApproval(item: Record<string, unknown>): Approval | null {
  const id =
    (item.approvalId as string | undefined) ??
    (item.id as string | undefined)
  if (!id) return null

  const sessionId =
    (item.sessionKey as string | undefined) ??
    (item.sessionId as string | undefined) ??
    id

  const statusRaw =
    (item.status as string | undefined) ??
    "pending"
  const status =
    statusRaw === "approved" || statusRaw === "rejected"
      ? statusRaw
      : "pending"

  const riskRaw =
    (item.risk as string | undefined) ??
    "medium"
  const risk =
    riskRaw === "low" || riskRaw === "high" ? riskRaw : "medium"

  return {
    id,
    runId: sessionId,
    sessionId,
    action: {
      type: "command",
      description:
        (item.description as string | undefined) ??
        `Approval ${id}`,
      payload: JSON.stringify(
        item.arguments ?? item.payload ?? {},
      ),
      risk,
    },
    status,
    createdAt:
      (item.createdAt as number | undefined) ??
      Date.now(),
    resolvedAt: item.resolvedAt as number | undefined,
    resolvedBy: item.resolvedBy as "user" | "policy" | undefined,
  }
}

export function useOpenClawApprovals() {
  const { addApproval, resolveApproval, setApprovals, setError } =
    useWorkDomainActions()
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

  const loadApprovals = useCallback(async () => {
    try {
      const response = await invoke<Record<string, unknown>>(
        "openclaw_list_approvals",
      )

      const rawList =
        (Array.isArray(response.approvals)
          ? response.approvals
          : Array.isArray(response.items)
            ? response.items
            : Array.isArray(response.list)
              ? response.list
              : []) as Array<unknown>

      const approvals = rawList
        .filter(
          (entry): entry is Record<string, unknown> =>
            !!entry && typeof entry === "object",
        )
        .map(toApproval)
        .filter((entry): entry is Approval => !!entry)

      setApprovals(approvals)
      return approvals
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return []
    }
  }, [setApprovals, setError])

  return {
    approve,
    reject,
    loadApprovals,
  }
}
