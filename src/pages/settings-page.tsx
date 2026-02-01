import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Shield,
  Zap,
  Key,
  Server,
  Terminal,
  Cloud,
  Cpu,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { useAgentState } from "@/hooks/use-agent-state"
import { useUIStore } from "@/stores/ui-store"
import { useSettingsStore } from "@/stores/settings-store"
import { PageHeader } from "@/components/shared/page-header"

export function SettingsPage() {
  const {
    mode,
    pendingApprovals,
    toggleMode,
  } = useAgentState()

  const { openApprovalDrawer, openTerminalDrawer } = useUIStore()

  const {
    preferences,
    providers,
    setPreference,
    setProviderConfig,
  } = useSettingsStore()

  const handleToggleMode = async () => {
    return toggleMode()
  }

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />

      {/* Draggable Top Spacer */}
      <div className="h-10 w-full shrink-0 z-50" data-tauri-drag-region />

      <div className="relative mx-auto grid mt-10 min-h-0 flex-1 w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 pb-4 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHeader
          mode={mode}
          pendingCount={pendingApprovals.length}
          onToggleMode={handleToggleMode}
          onOpenApprovals={openApprovalDrawer}
          onOpenTerminal={openTerminalDrawer}
          showSearch={false}
        />

        {/* Settings Content */}
        <div className="min-h-0 flex-1 overflow-y-auto space-y-6">
          {/* Mode Settings */}
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-5" />
                Approval Mode
              </CardTitle>
              <CardDescription>
                Control how agent actions are approved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Current Mode</span>
                    <Badge
                      variant="outline"
                      className={
                        mode === "safe"
                          ? "border-yellow-500/30 text-yellow-500"
                          : "border-green-500/30 text-green-500"
                      }
                    >
                      {mode === "safe" ? (
                        <>
                          <Shield className="size-3 mr-1" />
                          Safe
                        </>
                      ) : (
                        <>
                          <Zap className="size-3 mr-1" />
                          Auto
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mode === "safe"
                      ? "All actions require manual approval before execution"
                      : "Low-risk actions execute automatically without approval"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleToggleMode}>
                  Switch to {mode === "safe" ? "Auto" : "Safe"}
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Auto-approve read-only actions</span>
                    <p className="text-xs text-muted-foreground">
                      Automatically approve read_file, list_files, git_status, etc.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoApproveReadOnly}
                    onCheckedChange={(checked) =>
                      setPreference("autoApproveReadOnly", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Auto-approve low-risk actions</span>
                    <p className="text-xs text-muted-foreground">
                      Automatically approve search_web, open_url in auto mode
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoApproveLowRisk}
                    onCheckedChange={(checked) =>
                      setPreference("autoApproveLowRisk", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Providers */}
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="size-5" />
                Providers
              </CardTitle>
              <CardDescription>
                Configure AI agent providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CLI Provider */}
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center border border-border bg-muted">
                    <Terminal className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">CLI Provider</span>
                      {providers.cli.enabled ? (
                        <Badge variant="outline" className="text-[0.6rem] border-green-500/30 text-green-500">
                          <CheckCircle2 className="size-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[0.6rem] border-muted-foreground/30">
                          <XCircle className="size-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Claude Code CLI, Aider, etc.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={providers.cli.enabled}
                  onCheckedChange={(checked) =>
                    setProviderConfig("cli", { enabled: checked })
                  }
                />
              </div>

              {/* Local Provider */}
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center border border-border bg-muted">
                    <Cpu className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Local Provider</span>
                      {providers.local.enabled ? (
                        <Badge variant="outline" className="text-[0.6rem] border-green-500/30 text-green-500">
                          <CheckCircle2 className="size-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[0.6rem] border-muted-foreground/30">
                          <XCircle className="size-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ollama, LM Studio, LocalAI
                    </p>
                  </div>
                </div>
                <Switch
                  checked={providers.local.enabled}
                  onCheckedChange={(checked) =>
                    setProviderConfig("local", { enabled: checked })
                  }
                />
              </div>

              {/* API Provider */}
              <div className="flex items-center justify-between p-3 border border-border/60 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center border border-border bg-muted">
                    <Cloud className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">API Provider</span>
                      {providers.api.enabled ? (
                        <Badge variant="outline" className="text-[0.6rem] border-green-500/30 text-green-500">
                          <CheckCircle2 className="size-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[0.6rem] border-muted-foreground/30">
                          <XCircle className="size-3 mr-1" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      OpenAI, Anthropic, Google AI APIs
                    </p>
                  </div>
                </div>
                <Switch
                  checked={providers.api.enabled}
                  onCheckedChange={(checked) =>
                    setProviderConfig("api", { enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* API Keys (Placeholder) */}
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="size-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Key className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  API key management coming soon
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Configure API keys for Anthropic, OpenAI, and more
                </p>
              </div>
            </CardContent>
          </Card>

          {/* UI Preferences */}
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="size-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Customize the interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Compact mode</span>
                  <p className="text-xs text-muted-foreground">
                    Use smaller cards and reduced spacing
                  </p>
                </div>
                <Switch
                  checked={preferences.compactMode}
                  onCheckedChange={(checked) =>
                    setPreference("compactMode", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Event notifications</span>
                  <p className="text-xs text-muted-foreground">
                    Show toast notifications for agent events
                  </p>
                </div>
                <Switch
                  checked={preferences.showEventNotifications}
                  onCheckedChange={(checked) =>
                    setPreference("showEventNotifications", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
