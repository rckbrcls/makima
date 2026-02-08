import { useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import type { OpenClawFileConfig } from "@/lib/openclaw-types"
import { useWorkDomainActions } from "@/stores"

export function useOpenClawFileConfig() {
  const { setError } = useWorkDomainActions()

  const readFileConfig = useCallback(async (): Promise<OpenClawFileConfig | null> => {
    try {
      return await invoke<OpenClawFileConfig | null>("openclaw_read_file_config")
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [setError])

  const writeFileConfig = useCallback(
    async (config: OpenClawFileConfig): Promise<boolean> => {
      try {
        await invoke("openclaw_write_file_config", { config })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [setError],
  )

  return { readFileConfig, writeFileConfig }
}
