import { useCallback, useEffect } from "react"
import { Download, Play, Plug, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useOpenClawConfig,
  useOpenClawConnectionStatus,
  useOpenClawGatewayStatus,
  useOpenClawInstallation,
  useSettingsActions,
  useWorkError,
} from "@/stores"
import {
  useOpenClawConnection,
  useOpenClawGateway,
} from "@/hooks/openclaw"

type SetupStep =
  | "not_installed"
  | "installed_not_running"
  | "running_not_connected"
  | "connected"

function getSetupStep(
  installation: ReturnType<typeof useOpenClawInstallation>,
  gatewayStatus: ReturnType<typeof useOpenClawGatewayStatus>,
  connectionStatus: ReturnType<typeof useOpenClawConnectionStatus>,
): SetupStep {
  if (connectionStatus.status === "connected") return "connected"
  if (!installation?.installed) return "not_installed"
  if (!gatewayStatus?.isRunning) return "installed_not_running"
  return "running_not_connected"
}

export function WorkSetupCard() {
  const installation = useOpenClawInstallation()
  const gatewayStatus = useOpenClawGatewayStatus()
  const connectionStatus = useOpenClawConnectionStatus()
  const openclawConfig = useOpenClawConfig()
  const { setProviderConfig } = useSettingsActions()

  const workError = useWorkError()

  const {
    detectInstallation,
    installOpenClaw,
    isInstalling,
    startGateway,
    refreshGatewayStatus,
  } = useOpenClawGateway()
  const { connect } = useOpenClawConnection()

  const step = getSetupStep(installation, gatewayStatus, connectionStatus)

  // Detect on mount
  useEffect(() => {
    detectInstallation()
    refreshGatewayStatus()
  }, [detectInstallation, refreshGatewayStatus])

  const handleConnect = useCallback(async () => {
    await connect(openclawConfig.password, openclawConfig.token)
  }, [connect, openclawConfig.password, openclawConfig.token])

  const handleRefresh = useCallback(async () => {
    await detectInstallation()
    await refreshGatewayStatus()
  }, [detectInstallation, refreshGatewayStatus])

  if (step === "connected") return null

  return (
    <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
      <div className="w-full max-w-md space-y-6 p-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-foreground text-lg font-medium">
            OpenClaw Setup
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect to the OpenClaw gateway to start executing agents
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1: Installation */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={
                    installation?.installed
                      ? "flex size-6 items-center justify-center rounded-full border border-emerald-600 bg-emerald-900 text-xs text-emerald-300"
                      : "flex size-6 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground"
                  }
                >
                  1
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Install OpenClaw
                  </p>
                  {installation?.installed ? (
                    <p className="text-muted-foreground text-xs">
                      {installation.version
                        ? `v${installation.version}`
                        : "Installed"}
                      {installation.path ? ` at ${installation.path}` : ""}
                    </p>
                  ) : installation?.nodeAvailable === false ? (
                    <p className="text-muted-foreground text-xs">
                      Node.js required. Install from nodejs.org
                    </p>
                  ) : isInstalling ? (
                    <p className="text-muted-foreground text-xs">
                      Installing via npm...
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Install the OpenClaw CLI globally
                    </p>
                  )}
                </div>
              </div>
              {!installation?.installed && (
                <div className="flex gap-1.5">
                  {installation?.nodeAvailable !== false && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={installOpenClaw}
                      disabled={isInstalling}
                    >
                      <Download className="size-3" />
                      {isInstalling ? "Installing..." : "Install"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleRefresh}
                    disabled={isInstalling}
                  >
                    <RefreshCw className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Gateway running */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={
                    gatewayStatus?.isRunning
                      ? "flex size-6 items-center justify-center rounded-full border border-emerald-600 bg-emerald-900 text-xs text-emerald-300"
                      : "flex size-6 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground"
                  }
                >
                  2
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Start Gateway
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {gatewayStatus?.isRunning
                      ? `Running on port ${gatewayStatus.port}${gatewayStatus.pid ? ` (PID ${gatewayStatus.pid})` : ""}`
                      : "The gateway must be running to connect"}
                  </p>
                </div>
              </div>
              {installation?.installed && !gatewayStatus?.isRunning && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    void startGateway()
                  }}
                >
                  <Play className="size-3" />
                  Start
                </Button>
              )}
            </div>
          </div>

          {/* Step 3: Connect */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div
                className={
                  connectionStatus.status === "connected"
                    ? "flex size-6 items-center justify-center rounded-full border border-emerald-600 bg-emerald-900 text-xs text-emerald-300"
                    : "flex size-6 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground"
                }
              >
                3
              </div>
              <div className="flex-1">
                <p className="text-foreground text-sm font-medium">Connect</p>
                <p className="text-muted-foreground text-xs">
                  {connectionStatus.status === "connecting"
                    ? "Connecting..."
                    : connectionStatus.error
                      ? connectionStatus.error
                      : "Authenticate with the gateway"}
                </p>
              </div>
            </div>

            {gatewayStatus?.isRunning &&
              connectionStatus.status !== "connected" && (
                <div className="mt-3 space-y-2 pl-9">
                  <Input
                    type="password"
                    placeholder="Password (optional)"
                    value={openclawConfig.password ?? ""}
                    onChange={(e) =>
                      setProviderConfig("openclaw", {
                        password: e.target.value || undefined,
                      })
                    }
                    className="h-8 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={handleConnect}
                    disabled={connectionStatus.status === "connecting"}
                  >
                    <Plug className="size-3" />
                    {connectionStatus.status === "connecting"
                      ? "Connecting..."
                      : "Connect"}
                  </Button>
                </div>
              )}
          </div>
        </div>

        {/* Error */}
        {(connectionStatus.error || workError) && (
          <p className="text-center text-xs text-rose-400">
            {connectionStatus.error || workError}
          </p>
        )}
      </div>
    </section>
  )
}
