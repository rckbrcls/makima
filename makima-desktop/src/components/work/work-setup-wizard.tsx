import { useCallback, useEffect, useState } from "react"
import { Check, Download, Play, Plug, RefreshCw, Save } from "lucide-react"
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
  useOpenClawFileConfig,
  useOpenClawGateway,
} from "@/hooks/openclaw"

const STEP_DONE =
  "flex size-6 shrink-0 items-center justify-center rounded-full border border-emerald-600 bg-emerald-900 text-xs text-emerald-300"
const STEP_PENDING =
  "flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground"

export function WorkSetupWizard() {
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
  const { readFileConfig, writeFileConfig } = useOpenClawFileConfig()

  // Config form state
  const [configPort, setConfigPort] = useState(18789)
  const [configToken, setConfigToken] = useState("")
  const [configWorkspace, setConfigWorkspace] = useState("")
  const [configPassword, setConfigPassword] = useState("")
  const [configSaved, setConfigSaved] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  // Prevent flicker during initial auto-detection
  const [isInitializing, setIsInitializing] = useState(true)

  // Step completion
  const step1Done = !!installation?.installed
  const step2Done = configSaved
  const step3Done = !!gatewayStatus?.isRunning
  const step4Done = connectionStatus.status === "connected"

  // Active step (first incomplete)
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4

  // On mount: detect installation, gateway status, and read existing config
  useEffect(() => {
    async function init() {
      await Promise.all([
        detectInstallation(),
        refreshGatewayStatus(),
        readFileConfig().then((cfg) => {
          if (cfg) {
            setConfigPort(cfg.gateway.port)
            setConfigToken(cfg.gateway.auth.token)
            setConfigWorkspace(cfg.gateway.workspace ?? "")
            setConfigPassword(cfg.gateway.password ?? "")
            setConfigSaved(true)
          }
        }),
      ])
      setIsInitializing(false)
    }
    init()
  }, [detectInstallation, refreshGatewayStatus, readFileConfig])

  const handleRefresh = useCallback(async () => {
    await detectInstallation()
    await refreshGatewayStatus()
  }, [detectInstallation, refreshGatewayStatus])

  const handleSaveConfig = useCallback(async () => {
    setIsSavingConfig(true)
    const token = configToken || crypto.randomUUID()
    const success = await writeFileConfig({
      gateway: {
        mode: "local",
        port: configPort,
        auth: { token },
        workspace: configWorkspace || undefined,
        password: configPassword || undefined,
      },
    })
    if (success) {
      setConfigToken(token)
      setConfigSaved(true)
    }
    setIsSavingConfig(false)
  }, [writeFileConfig, configPort, configToken, configWorkspace, configPassword])

  const handleStartGateway = useCallback(async () => {
    setIsStarting(true)
    await startGateway(
      configPort,
      configWorkspace || undefined,
      configPassword || undefined,
    )
    setIsStarting(false)
  }, [startGateway, configPort, configWorkspace, configPassword])

  const handleConnect = useCallback(async () => {
    await connect(openclawConfig.password, openclawConfig.token ?? configToken)
  }, [connect, openclawConfig.password, openclawConfig.token, configToken])

  // Don't render while initializing
  if (isInitializing) {
    return (
      <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
        <p className="text-muted-foreground text-sm">Detecting setup...</p>
      </section>
    )
  }

  // Already connected - hide wizard
  if (step4Done) return null

  return (
    <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
      <div className="w-full max-w-md space-y-6 p-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-foreground text-lg font-medium">
            OpenClaw Setup
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure and connect to the OpenClaw gateway
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1: Install */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={step1Done ? STEP_DONE : STEP_PENDING}>
                  {step1Done ? <Check className="size-3" /> : "1"}
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
              {!step1Done && (
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

          {/* Step 2: Configure */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={step2Done ? STEP_DONE : STEP_PENDING}>
                  {step2Done ? <Check className="size-3" /> : "2"}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Configure Gateway
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {step2Done
                      ? `Port ${configPort}${configWorkspace ? `, workspace: ${configWorkspace}` : ""}`
                      : "Set up gateway configuration file"}
                  </p>
                </div>
              </div>
            </div>

            {/* Config form - show when step 1 done, step 2 is active */}
            {step1Done && activeStep === 2 && (
              <div className="mt-3 space-y-3 pl-9">
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Gateway Mode
                  </label>
                  <Input
                    value="local"
                    disabled
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Port
                  </label>
                  <Input
                    type="number"
                    value={configPort}
                    onChange={(e) =>
                      setConfigPort(Number(e.target.value) || 18789)
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Auth Token
                  </label>
                  <Input
                    placeholder="Auto-generated on save"
                    value={configToken}
                    onChange={(e) => setConfigToken(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Required by the gateway. Auto-generated if left empty.
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Workspace (optional)
                  </label>
                  <Input
                    placeholder="~/.openclaw/workspace"
                    value={configWorkspace}
                    onChange={(e) => setConfigWorkspace(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    Gateway Password (optional)
                  </label>
                  <Input
                    type="password"
                    placeholder="Leave empty for no password"
                    value={configPassword}
                    onChange={(e) => setConfigPassword(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                >
                  <Save className="size-3" />
                  {isSavingConfig ? "Saving..." : "Save & Continue"}
                </Button>
              </div>
            )}
          </div>

          {/* Step 3: Start Gateway */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={step3Done ? STEP_DONE : STEP_PENDING}>
                  {step3Done ? <Check className="size-3" /> : "3"}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    Start Gateway
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {gatewayStatus?.isRunning
                      ? `Running on port ${gatewayStatus.port}${gatewayStatus.pid ? ` (PID ${gatewayStatus.pid})` : ""}`
                      : "Launch the OpenClaw gateway process"}
                  </p>
                </div>
              </div>
              {step2Done && !step3Done && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleStartGateway}
                  disabled={isStarting}
                >
                  <Play className="size-3" />
                  {isStarting ? "Starting..." : "Start"}
                </Button>
              )}
            </div>
          </div>

          {/* Step 4: Connect */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={STEP_PENDING}>
                4
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

            {step3Done && connectionStatus.status !== "connected" && (
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
