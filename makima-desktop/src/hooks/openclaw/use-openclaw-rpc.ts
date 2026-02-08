import { useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import type {
  OpenClawConfigApplyResult,
  OpenClawConfigSchema,
  OpenClawHealthStatus,
  OpenClawToolDescriptor,
} from "@/lib/openclaw-types"
import { useWorkDomainActions } from "@/stores"

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item),
    )
  }
  return []
}

function firstArray(
  source: Record<string, unknown>,
  keys: Array<string>,
): Array<Record<string, unknown>> {
  for (const key of keys) {
    const parsed = asArray(source[key])
    if (parsed.length > 0) return parsed
  }
  return []
}

function firstObject(
  source: Record<string, unknown>,
  keys: Array<string>,
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const candidate = source[key]
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>
    }
  }
  return undefined
}

export function useOpenClawRpc() {
  const { setError } = useWorkDomainActions()

  const rpc = useCallback(
    async (method: string, params?: Record<string, unknown>) => {
      try {
        return await invoke<unknown>("openclaw_rpc", {
          method,
          params,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw err
      }
    },
    [setError],
  )

  const rpcWithFallback = useCallback(
    async (methods: Array<string>, params?: Record<string, unknown>) => {
      try {
        return await invoke<unknown>("openclaw_rpc_with_fallback", {
          methods,
          params,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        throw err
      }
    },
    [setError],
  )

  const getStatus = useCallback(async () => {
    try {
      return await invoke<Record<string, unknown>>("openclaw_get_status")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    }
  }, [setError])

  const getHealth = useCallback(async (): Promise<OpenClawHealthStatus | null> => {
    try {
      const raw = await invoke<unknown>("openclaw_get_health")
      const obj = asObject(raw)
      return {
        ok:
          (obj.ok as boolean | undefined) ??
          (obj.healthy as boolean | undefined) ??
          (obj.status as string | undefined) === "ok",
        status: obj.status as string | undefined,
        latencyMs:
          (obj.latencyMs as number | undefined) ??
          (obj.latency as number | undefined),
        details: obj,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    }
  }, [setError])

  const ping = useCallback(async () => {
    try {
      return await invoke<Record<string, unknown>>("openclaw_ping")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    }
  }, [setError])

  const getConfig = useCallback(async () => {
    try {
      return await invoke<Record<string, unknown>>("openclaw_get_config")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    }
  }, [setError])

  const getConfigSchema = useCallback(async (): Promise<OpenClawConfigSchema | null> => {
    try {
      const raw = await invoke<Record<string, unknown>>("openclaw_get_config_schema")
      return { raw }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    }
  }, [setError])

  const applyConfig = useCallback(
    async (config: Record<string, unknown>): Promise<OpenClawConfigApplyResult | null> => {
      try {
        const raw = await invoke<Record<string, unknown>>("openclaw_apply_config", {
          config,
        })
        return {
          ok: (raw.ok as boolean | undefined) ?? true,
          warnings: Array.isArray(raw.warnings)
            ? raw.warnings.filter((w): w is string => typeof w === "string")
            : undefined,
          restarted: raw.restarted as boolean | undefined,
          raw,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return null
      }
    },
    [setError],
  )

  const patchConfig = useCallback(
    async (patch: Record<string, unknown>): Promise<OpenClawConfigApplyResult | null> => {
      try {
        const raw = await invoke<Record<string, unknown>>("openclaw_patch_config", {
          patch,
        })
        return {
          ok: (raw.ok as boolean | undefined) ?? true,
          warnings: Array.isArray(raw.warnings)
            ? raw.warnings.filter((w): w is string => typeof w === "string")
            : undefined,
          restarted: raw.restarted as boolean | undefined,
          raw,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return null
      }
    },
    [setError],
  )

  const listApprovals = useCallback(async () => {
    try {
      return await invoke<Record<string, unknown>>("openclaw_list_approvals")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return null
    }
  }, [setError])

  const listTools = useCallback(async (): Promise<Array<OpenClawToolDescriptor>> => {
    try {
      const raw = await invoke<Record<string, unknown>>("openclaw_list_tools")
      const candidates = firstArray(raw, ["tools", "items", "list"])

      return candidates.map((item) => ({
        name:
          (item.name as string | undefined) ??
          (item.id as string | undefined) ??
          "unknown-tool",
        description: item.description as string | undefined,
        risk: item.risk as string | undefined,
        inputSchema: firstObject(item, ["inputSchema", "schema", "parameters"]),
        raw: item,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return []
    }
  }, [setError])

  const invokeTool = useCallback(
    async (name: string, argumentsPayload?: Record<string, unknown>) => {
      try {
        return await invoke<Record<string, unknown>>("openclaw_invoke_tool", {
          name,
          arguments: argumentsPayload,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return null
      }
    },
    [setError],
  )

  const createSession = useCallback(
    async (agentId?: string, title?: string) => {
      try {
        return await invoke<Record<string, unknown>>("openclaw_create_session", {
          agentId,
          title,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return null
      }
    },
    [setError],
  )

  const resumeSession = useCallback(
    async (sessionKey: string) => {
      try {
        return await invoke<Record<string, unknown>>("openclaw_resume_session", {
          sessionKey,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        return null
      }
    },
    [setError],
  )

  return {
    rpc,
    rpcWithFallback,
    getStatus,
    getHealth,
    ping,
    getConfig,
    getConfigSchema,
    applyConfig,
    patchConfig,
    listApprovals,
    listTools,
    invokeTool,
    createSession,
    resumeSession,
  }
}
