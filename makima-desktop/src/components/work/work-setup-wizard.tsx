import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check,
  Download,
  Loader2,
  Play,
  Plug,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  useOpenClawCapabilities,
  useOpenClawConfig,
  useOpenClawConnectionStatus,
  useOpenClawGatewayStatus,
  useOpenClawInstallation,
  useOpenClawSetupComplete,
  useOpenClawWizardState,
  useSettingsActions,
  useWorkDomainActions,
  useWorkError,
} from "@/stores"
import {
  useOpenClawCapabilities as useOpenClawCapabilitiesHook,
  useOpenClawConnection,
  useOpenClawFileConfig,
  useOpenClawGateway,
  useOpenClawRpc,
  useOpenClawWizard,
} from "@/hooks/openclaw"

const STEP_DONE =
  "flex size-6 shrink-0 items-center justify-center rounded-full border border-emerald-600 bg-emerald-900 text-xs text-emerald-300"
const STEP_PENDING =
  "flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground"

export function WorkSetupWizard() {
  const installation = useOpenClawInstallation()
  const gatewayStatus = useOpenClawGatewayStatus()
  const connectionStatus = useOpenClawConnectionStatus()
  const wizardState = useOpenClawWizardState()
  const setupComplete = useOpenClawSetupComplete()
  const capabilities = useOpenClawCapabilities()
  const openclawConfig = useOpenClawConfig()
  const workError = useWorkError()

  const { setProviderConfig } = useSettingsActions()
  const { setSetupComplete } = useWorkDomainActions()

  const {
    detectInstallation,
    installOpenClaw,
    isInstalling,
    startGateway,
    refreshGatewayStatus,
  } = useOpenClawGateway()
  const { connect } = useOpenClawConnection()
  const { readFileConfig, writeFileConfig } = useOpenClawFileConfig()
  const { getStatus, getHealth } = useOpenClawRpc()
  const { startWizard, nextWizard, getWizardStatus, cancelWizard } =
    useOpenClawWizard()
  const { refreshCapabilities } = useOpenClawCapabilitiesHook()

  const [isInitializing, setIsInitializing] = useState(true)
  const [isStartingGateway, setIsStartingGateway] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isWizardSubmitting, setIsWizardSubmitting] = useState(false)
  const [wizardInput, setWizardInput] = useState<Record<string, unknown>>({})
  const [wizardError, setWizardError] = useState<string | null>(null)

  // Legacy fallback config (used when wizard is unavailable)
  const [configPort, setConfigPort] = useState(18789)
  const [configToken, setConfigToken] = useState("")
  const [configWorkspace, setConfigWorkspace] = useState("")
  const [configPassword, setConfigPassword] = useState("")
  const [configSaved, setConfigSaved] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  const wizardSupported = capabilities?.wizard ?? true

  const wizardDone = wizardSupported ? !!wizardState?.completed : configSaved

  const step1Done = !!installation?.installed
  const step3Done = !!gatewayStatus?.isRunning
  const step4Done = connectionStatus.status === "connected"
  const step2Done = wizardSupported
    ? wizardDone || !step3Done || !step4Done
    : configSaved

  const activeStep =
    !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : !step4Done ? 4 : 5

  const validateAndCompleteSetup = useCallback(async (wizardReady: boolean) => {
    const [status, health] = await Promise.all([getStatus(), getHealth()])
    const healthy = health?.ok ?? false
    if (status && healthy && wizardReady) {
      setSetupComplete(true)
      return true
    }
    setSetupComplete(false)
    return false
  }, [getHealth, getStatus, setSetupComplete])

  useEffect(() => {
    async function initialize() {
      await Promise.all([
        detectInstallation(),
        refreshGatewayStatus(),
        refreshCapabilities(),
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

      if (connectionStatus.status === "connected") {
        // Try resuming wizard status when already connected.
        await getWizardStatus()
      }

      setIsInitializing(false)
    }

    initialize()
  }, [
    detectInstallation,
    getWizardStatus,
    readFileConfig,
    refreshCapabilities,
    refreshGatewayStatus,
    connectionStatus.status,
  ])

  useEffect(() => {
    if (wizardState?.prompts) {
      const defaults: Record<string, unknown> = {}
      for (const prompt of wizardState.prompts) {
        defaults[prompt.id] = prompt.defaultValue ?? ""
      }
      setWizardInput(defaults)
    }
  }, [wizardState?.stepId, wizardState?.prompts])

  useEffect(() => {
    if (connectionStatus.status === "connected" && !setupComplete) {
      validateAndCompleteSetup(wizardDone).catch(() => {
        // Best effort validation.
      })
    }
  }, [connectionStatus.status, setupComplete, validateAndCompleteSetup, wizardDone])

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      detectInstallation(),
      refreshGatewayStatus(),
      refreshCapabilities(),
    ])
  }, [detectInstallation, refreshCapabilities, refreshGatewayStatus])

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
      setProviderConfig("openclaw", {
        token,
        password: configPassword || undefined,
      })
    }

    setIsSavingConfig(false)
  }, [
    configPassword,
    configPort,
    configToken,
    configWorkspace,
    setProviderConfig,
    writeFileConfig,
  ])

  const handleStartWizard = useCallback(async () => {
    if (!step4Done) {
      setWizardError("Connect to gateway before running wizard")
      return
    }

    setWizardError(null)
    setIsWizardSubmitting(true)
    try {
      await startWizard()
    } finally {
      setIsWizardSubmitting(false)
    }
  }, [startWizard, step4Done])

  const handleNextWizard = useCallback(async () => {
    if (!wizardState?.sessionId) return

    setWizardError(null)
    setIsWizardSubmitting(true)
    try {
      const next = await nextWizard(wizardState.sessionId, wizardInput)
      if (!next) {
        setWizardError("Failed to continue wizard")
      } else if (next.completed) {
        await validateAndCompleteSetup(true)
      }
    } finally {
      setIsWizardSubmitting(false)
    }
  }, [nextWizard, validateAndCompleteSetup, wizardInput, wizardState?.sessionId])

  const handleCancelWizard = useCallback(async () => {
    if (!wizardState?.sessionId) return
    await cancelWizard(wizardState.sessionId)
  }, [cancelWizard, wizardState?.sessionId])

  const handleStartGateway = useCallback(async () => {
    setIsStartingGateway(true)
    try {
      await startGateway(
        configPort,
        configWorkspace || undefined,
        configPassword || undefined,
      )
      await refreshGatewayStatus()
    } finally {
      setIsStartingGateway(false)
    }
  }, [
    configPassword,
    configPort,
    configWorkspace,
    refreshGatewayStatus,
    startGateway,
  ])

  const handleConnect = useCallback(async () => {
    setIsConnecting(true)
    try {
      const connected = await connect(
        openclawConfig.password,
        openclawConfig.token ?? configToken,
      )
      if (connected) {
        await validateAndCompleteSetup(wizardDone)
      }
    } finally {
      setIsConnecting(false)
    }
  }, [
    configToken,
    connect,
    openclawConfig.password,
    openclawConfig.token,
    validateAndCompleteSetup,
    wizardDone,
  ])

  const handleValidate = useCallback(async () => {
    setIsValidating(true)
    try {
      await validateAndCompleteSetup(wizardDone)
    } finally {
      setIsValidating(false)
    }
  }, [validateAndCompleteSetup, wizardDone])

  const step2Description = useMemo(() => {
    if (wizardSupported) {
      if (wizardState?.completed) return "Wizard completed"
      if (wizardState?.title) return wizardState.title
      if (!step4Done) return "Connect to gateway first to run wizard"
      return "Run guided setup from gateway"
    }

    return configSaved
      ? `Port ${configPort}${configWorkspace ? `, workspace: ${configWorkspace}` : ""}`
      : "Gateway does not expose wizard; configure file fallback"
  }, [configPort, configSaved, configWorkspace, step4Done, wizardState, wizardSupported])

  if (isInitializing) {
    return (
      <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Initializing OpenClaw setup...
        </div>
      </section>
    )
  }

  if (setupComplete && step4Done) {
    return null
  }

  return (
    <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
      <div className="w-full max-w-2xl space-y-6 p-8">
        <div className="text-center">
          <h2 className="text-foreground text-lg font-medium">OpenClaw Setup</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Wizard-first onboarding before using Work runtime
          </p>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={step1Done ? STEP_DONE : STEP_PENDING}>
                  {step1Done ? <Check className="size-3" /> : "1"}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">Install OpenClaw</p>
                  {installation?.installed ? (
                    <p className="text-muted-foreground text-xs">
                      {installation.version ? `v${installation.version}` : "Installed"}
                      {installation.path ? ` at ${installation.path}` : ""}
                    </p>
                  ) : installation?.nodeAvailable === false ? (
                    <p className="text-muted-foreground text-xs">
                      Node.js required. Install from nodejs.org
                    </p>
                  ) : isInstalling ? (
                    <p className="text-muted-foreground text-xs">Installing via npm...</p>
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

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={step2Done ? STEP_DONE : STEP_PENDING}>
                  {step2Done ? <Check className="size-3" /> : "2"}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">
                    {wizardSupported ? "Run Gateway Wizard" : "Configure Fallback"}
                  </p>
                  <p className="text-muted-foreground text-xs">{step2Description}</p>
                </div>
              </div>
              {wizardSupported && wizardState?.sessionId && !wizardState.completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCancelWizard}
                  disabled={isWizardSubmitting}
                >
                  <RotateCcw className="size-3" />
                  Cancel
                </Button>
              )}
            </div>

            {step1Done && activeStep === 2 && (
              <div className="mt-3 space-y-3 pl-9">
                {wizardSupported ? (
                  <>
                    {!wizardState?.sessionId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={handleStartWizard}
                        disabled={isWizardSubmitting}
                      >
                        {isWizardSubmitting ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Play className="size-3" />
                        )}
                        Start Wizard
                      </Button>
                    )}

                    {wizardState?.sessionId && !wizardState.completed && (
                      <>
                        {wizardState.prompts.length === 0 ? (
                          <p className="text-muted-foreground text-xs">
                            Waiting for next wizard prompt...
                          </p>
                        ) : (
                          <>
                            {wizardState.prompts.map((prompt) => (
                              <div key={prompt.id}>
                                <label className="text-muted-foreground mb-1 block text-xs">
                                  {prompt.label}
                                  {prompt.required ? " *" : ""}
                                </label>

                                {prompt.type === "boolean" ? (
                                  <div className="flex h-8 items-center">
                                    <Switch
                                      checked={Boolean(wizardInput[prompt.id])}
                                      onCheckedChange={(checked) =>
                                        setWizardInput((prev) => ({
                                          ...prev,
                                          [prompt.id]: checked,
                                        }))
                                      }
                                    />
                                  </div>
                                ) : prompt.type === "select" &&
                                  prompt.options &&
                                  prompt.options.length > 0 ? (
                                  <select
                                    className="bg-input h-8 w-full rounded border border-border px-2 text-sm"
                                    value={(wizardInput[prompt.id] as string | undefined) ?? ""}
                                    onChange={(e) =>
                                      setWizardInput((prev) => ({
                                        ...prev,
                                        [prompt.id]: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">Select...</option>
                                    {prompt.options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    type={prompt.type === "password" ? "password" : "text"}
                                    value={String(wizardInput[prompt.id] ?? "")}
                                    onChange={(e) =>
                                      setWizardInput((prev) => ({
                                        ...prev,
                                        [prompt.id]:
                                          prompt.type === "number"
                                            ? Number(e.target.value)
                                            : e.target.value,
                                      }))
                                    }
                                    className="h-8 text-sm"
                                  />
                                )}

                                {prompt.description && (
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {prompt.description}
                                  </p>
                                )}
                              </div>
                            ))}

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-1.5"
                              onClick={handleNextWizard}
                              disabled={isWizardSubmitting}
                            >
                              {isWizardSubmitting ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Save className="size-3" />
                              )}
                              Continue Wizard
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-muted-foreground mb-1 block text-xs">Port</label>
                      <Input
                        type="number"
                        value={configPort}
                        onChange={(e) => setConfigPort(Number(e.target.value) || 18789)}
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
                        Password (optional)
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
                      {isSavingConfig ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Save className="size-3" />
                      )}
                      Save Config
                    </Button>
                  </>
                )}

                {(wizardError || workError) && (
                  <p className="text-xs text-rose-400">{wizardError || workError}</p>
                )}
              </div>
            )}
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={step3Done ? STEP_DONE : STEP_PENDING}>
                  {step3Done ? <Check className="size-3" /> : "3"}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">Start Gateway</p>
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
                  disabled={isStartingGateway}
                >
                  {isStartingGateway ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Play className="size-3" />
                  )}
                  {isStartingGateway ? "Starting..." : "Start"}
                </Button>
              )}
            </div>
          </div>

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={step4Done ? STEP_DONE : STEP_PENDING}>
                  {step4Done ? <Check className="size-3" /> : "4"}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">Connect + Validate</p>
                  <p className="text-muted-foreground text-xs">
                    {connectionStatus.status === "connecting"
                      ? "Connecting..."
                      : connectionStatus.error
                        ? connectionStatus.error
                        : setupComplete
                          ? "Gateway validated"
                          : "Authenticate and validate gateway health"}
                  </p>
                </div>
              </div>
            </div>

            {step3Done && !step4Done && (
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
                  disabled={isConnecting || connectionStatus.status === "connecting"}
                >
                  {isConnecting || connectionStatus.status === "connecting" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plug className="size-3" />
                  )}
                  Connect
                </Button>
              </div>
            )}

            {step3Done && step4Done && !setupComplete && (
              <div className="mt-3 space-y-2 pl-9">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Validate Setup
                </Button>
              </div>
            )}
          </div>
        </div>

        {(connectionStatus.error || wizardError || workError) && (
          <p className="text-center text-xs text-rose-400">
            {connectionStatus.error || wizardError || workError}
          </p>
        )}
      </div>
    </section>
  )
}
