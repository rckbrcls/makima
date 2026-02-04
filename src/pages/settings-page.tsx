import {
  CheckCircle2,
  Cloud,
  Cpu,
  Key,
  Server,
  Settings,
  Shield,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAgentState } from "@/hooks/use-agent-state";
import { useSettingsStore } from "@/stores/settings-store";

export function SettingsPage() {
  const { mode, toggleMode } = useAgentState();

  const { preferences, providers, setPreference, setProviderConfig } =
    useSettingsStore();

  const handleToggleMode = async () => {
    return toggleMode();
  };

  return (
    <div className="bg-transparent text-foreground relative flex h-full flex-col overflow-hidden">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px] opacity-50" />

      {/* Draggable Top Spacer */}
      <div className="z-50 h-10 w-full shrink-0" data-tauri-drag-region />

      <div className="relative mx-auto mt-10 grid min-h-0 w-full flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 pb-4 sm:px-6 lg:px-8">
        {/* Header */}

        {/* Settings Content */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
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
                          <Shield className="mr-1 size-3" />
                          Safe
                        </>
                      ) : (
                        <>
                          <Zap className="mr-1 size-3" />
                          Auto
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
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
                    <span className="text-sm font-medium">
                      Auto-approve read-only actions
                    </span>
                    <p className="text-muted-foreground text-xs">
                      Automatically approve read_file, list_files, git_status,
                      etc.
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
                    <span className="text-sm font-medium">
                      Auto-approve low-risk actions
                    </span>
                    <p className="text-muted-foreground text-xs">
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
              <CardDescription>Configure AI agent providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CLI Provider */}
              <div className="border-border/60 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="border-border bg-muted flex size-10 items-center justify-center border">
                    <Terminal className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">CLI Provider</span>
                      {providers.cli.enabled ? (
                        <Badge
                          variant="outline"
                          className="border-green-500/30 text-[0.6rem] text-green-500"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/30 text-[0.6rem]"
                        >
                          <XCircle className="mr-1 size-3" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
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
              <div className="border-border/60 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="border-border bg-muted flex size-10 items-center justify-center border">
                    <Cpu className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Local Provider
                      </span>
                      {providers.local.enabled ? (
                        <Badge
                          variant="outline"
                          className="border-green-500/30 text-[0.6rem] text-green-500"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/30 text-[0.6rem]"
                        >
                          <XCircle className="mr-1 size-3" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
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
              <div className="border-border/60 flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="border-border bg-muted flex size-10 items-center justify-center border">
                    <Cloud className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">API Provider</span>
                      {providers.api.enabled ? (
                        <Badge
                          variant="outline"
                          className="border-green-500/30 text-[0.6rem] text-green-500"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/30 text-[0.6rem]"
                        >
                          <XCircle className="mr-1 size-3" />
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
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
                <Key className="text-muted-foreground/30 mb-3 size-10" />
                <p className="text-muted-foreground text-sm">
                  API key management coming soon
                </p>
                <p className="text-muted-foreground/70 mt-1 text-xs">
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
              <CardDescription>Customize the interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Compact mode</span>
                  <p className="text-muted-foreground text-xs">
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
                  <span className="text-sm font-medium">
                    Event notifications
                  </span>
                  <p className="text-muted-foreground text-xs">
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
  );
}
