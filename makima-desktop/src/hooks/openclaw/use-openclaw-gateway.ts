import { useCallback, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import type {
  OpenClawInstallation,
  GatewayProcessStatus,
} from "@/lib/openclaw-types"
import { useWorkDomainActions } from "@/stores"

export function useOpenClawGateway() {
  const { setOpenClawInstallation, setOpenClawGatewayStatus, setError } =
    useWorkDomainActions()

  const [isInstalling, setIsInstalling] = useState(false)

  const detectInstallation = useCallback(async () => {
    try {
      const installation =
        await invoke<OpenClawInstallation>("openclaw_detect_installation")
      setOpenClawInstallation(installation)
      return installation
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [setOpenClawInstallation, setError])

  const installOpenClaw = useCallback(async () => {
    setIsInstalling(true)
    setError(null)
    try {
      const installation =
        await invoke<OpenClawInstallation>("openclaw_install")
      setOpenClawInstallation(installation)
      return { success: true, installation }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      return { success: false, installation: null }
    } finally {
      setIsInstalling(false)
    }
  }, [setOpenClawInstallation, setError])

  const startGateway = useCallback(
    async (port?: number, workspace?: string, password?: string) => {
      try {
        const pid = await invoke<number>("openclaw_start_gateway", {
          port,
          workspace,
          password,
        })
        // Refresh status after starting
        const status =
          await invoke<GatewayProcessStatus>("openclaw_get_gateway_status")
        setOpenClawGatewayStatus(status)
        return pid
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [setOpenClawGatewayStatus, setError],
  )

  const stopGateway = useCallback(async () => {
    try {
      await invoke("openclaw_stop_gateway")
      const status =
        await invoke<GatewayProcessStatus>("openclaw_get_gateway_status")
      setOpenClawGatewayStatus(status)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [setOpenClawGatewayStatus, setError])

  const refreshGatewayStatus = useCallback(async () => {
    try {
      const status =
        await invoke<GatewayProcessStatus>("openclaw_get_gateway_status")
      setOpenClawGatewayStatus(status)
      return status
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [setOpenClawGatewayStatus, setError])

  return {
    detectInstallation,
    installOpenClaw,
    isInstalling,
    startGateway,
    stopGateway,
    refreshGatewayStatus,
  }
}
