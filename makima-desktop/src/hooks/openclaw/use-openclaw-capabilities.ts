import { useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { OpenClawCapabilities } from "@/lib/openclaw-types"
import { useWorkDomainActions } from "@/stores"

const METHOD_NOT_FOUND_PATTERNS = [
  "unknown method",
  "method not found",
  "not implemented",
  "unrecognized method",
  "does not exist",
]

function includesMethodNotFound(error: string): boolean {
  const normalized = error.toLowerCase()
  return METHOD_NOT_FOUND_PATTERNS.some((pattern) => normalized.includes(pattern))
}

const DEFAULT_CAPABILITIES: OpenClawCapabilities = {
  rpc: false,
  wizard: false,
  status: false,
  health: false,
  ping: false,
  configSchema: false,
  configApply: false,
  configPatch: false,
  approvalsList: false,
  toolsList: false,
  toolsInvoke: false,
  sessionNew: false,
  sessionResume: false,
  send: false,
  agentSend: false,
}

export function useOpenClawCapabilities() {
  const { setCapabilities, setError } = useWorkDomainActions()

  const probe = useCallback(
    async (methods: Array<string>, params?: Record<string, unknown>) => {
      try {
        await invoke("openclaw_rpc_with_fallback", { methods, params })
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (includesMethodNotFound(message)) {
          return false
        }

        // Non-method errors (validation/auth/etc.) imply the method likely exists.
        return true
      }
    },
    [],
  )

  const refreshCapabilities = useCallback(async () => {
    try {
      const capabilities: OpenClawCapabilities = {
        ...DEFAULT_CAPABILITIES,
        rpc: true,
        wizard: await probe(["wizard.status", "setup.wizard.status"]),
        status: await probe(["status", "gateway.status"]),
        health: await probe(["health", "gateway.health"]),
        ping: await probe(["ping", "gateway.ping"]),
        configSchema: await probe(["config.schema", "config.getSchema"]),
        configApply: await probe(["config.apply", "config.patch"], {
          config: {},
        }),
        configPatch: await probe(["config.patch", "config.apply"], {
          patch: {},
        }),
        approvalsList: await probe(["approval.list", "approvals.list"]),
        toolsList: await probe(["tools.list", "tool.list"]),
        toolsInvoke: await probe(["tools.invoke", "tool.invoke"], {
          name: "__capability_probe__",
          arguments: {},
        }),
        sessionNew: await probe(["session.new", "session.create"], {}),
        sessionResume: await probe(["session.resume", "session.get"], {
          sessionKey: "__capability_probe__",
        }),
        send: await probe(["send", "chat.send"], {
          to: "agent:__capability_probe__:main",
          idempotencyKey: "00000000-0000-4000-8000-000000000000",
          message: "capability probe",
        }),
        agentSend: await probe(["agent.send"], {
          agentId: "__capability_probe__",
          sessionKey: "__capability_probe__",
          message: "capability probe",
        }),
      }

      setCapabilities(capabilities)
      return capabilities
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setCapabilities(DEFAULT_CAPABILITIES)
      return DEFAULT_CAPABILITIES
    }
  }, [probe, setCapabilities, setError])

  return {
    refreshCapabilities,
  }
}
