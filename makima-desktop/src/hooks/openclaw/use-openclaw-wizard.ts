import { useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import { normalizeWizardState } from "./wizard-normalization"
import { useWorkDomainActions } from "@/stores"

export function useOpenClawWizard() {
  const { setError, setWizardState } = useWorkDomainActions()

  const startWizard = useCallback(
    async (params?: Record<string, unknown>) => {
      try {
        const result = await invoke<unknown>("openclaw_wizard_start", { params })
        const state = normalizeWizardState(result)
        setWizardState(state)
        return state
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [setError, setWizardState],
  )

  const nextWizard = useCallback(
    async (sessionId: string, input?: Record<string, unknown>) => {
      try {
        const result = await invoke<unknown>("openclaw_wizard_next", {
          sessionId,
          input,
        })
        const state = normalizeWizardState(result)
        setWizardState(state)
        return state
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [setError, setWizardState],
  )

  const getWizardStatus = useCallback(
    async (sessionId?: string) => {
      try {
        const result = await invoke<unknown>("openclaw_wizard_status", {
          sessionId,
        })
        const state = normalizeWizardState(result)
        setWizardState(state)
        return state
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [setError, setWizardState],
  )

  const cancelWizard = useCallback(
    async (sessionId: string) => {
      try {
        await invoke("openclaw_wizard_cancel", { sessionId })
        setWizardState(null)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [setError, setWizardState],
  )

  return {
    startWizard,
    nextWizard,
    getWizardStatus,
    cancelWizard,
  }
}
