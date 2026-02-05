import { useEffect, useState } from "react"
import {
  ExternalLink,
  HardDrive,
  Info,
  Loader2,
  Monitor,
  Moon,
  Play,
  Settings,
  Square,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "@/components/theme-provider"
import { useSettingsStore } from "@/stores/settings-store"
import {
  useOllamaCanStart,
  useOllamaCanStop,
  useOllamaConnected,
  useOllamaInstallation,
  useOllamaProcessStatus,
} from "@/stores/provider-store"
import { useOllamaProcess } from "@/hooks/ollama/use-ollama-process"
import { useOllamaModelsHook } from "@/hooks/ollama/use-ollama-models"
import { useOllamaConnection } from "@/hooks/ollama/use-ollama-connection"
import { cn } from "@/lib/utils"

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Theme = "dark" | "light" | "system";

const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const settings = useSettingsStore()

  // Ollama process state
  const isOllamaConnected = useOllamaConnected()
  const installation = useOllamaInstallation()
  const processStatus = useOllamaProcessStatus()
  const canStart = useOllamaCanStart()
  const canStop = useOllamaCanStop()

  // Ollama process hooks
  const { detectInstallation, startProcess, stopProcess, refreshStatus } =
    useOllamaProcess()
  const { fetchModels } = useOllamaModelsHook()
  const { checkHealth } = useOllamaConnection()

  // Local state for form fields
  const [ollamaEndpoint, setOllamaEndpoint] = useState(
    settings.providers.ollama.endpoint ?? "",
  )
  const [numParallel, setNumParallel] = useState(
    settings.providers.ollama.numParallel ?? 1,
  )
  const [compactMode, setCompactMode] = useState(
    settings.preferences.compactMode,
  )
  const [showEventNotifications, setShowEventNotifications] = useState(
    settings.preferences.showEventNotifications,
  )
  const [autoApproveReadOnly, setAutoApproveReadOnly] = useState(
    settings.preferences.autoApproveReadOnly,
  )
  const [autoApproveLowRisk, setAutoApproveLowRisk] = useState(
    settings.preferences.autoApproveLowRisk,
  )

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setOllamaEndpoint(settings.providers.ollama.endpoint ?? "")
      setNumParallel(settings.providers.ollama.numParallel ?? 1)
      setCompactMode(settings.preferences.compactMode)
      setShowEventNotifications(settings.preferences.showEventNotifications)
      setAutoApproveReadOnly(settings.preferences.autoApproveReadOnly)
      setAutoApproveLowRisk(settings.preferences.autoApproveLowRisk)
      // Detect Ollama installation, check health, and refresh status when dialog opens
      detectInstallation()
      checkHealth()
      refreshStatus()
    }
  }, [open, settings, detectInstallation, checkHealth, refreshStatus])

  const handleStartOllama = async () => {
    console.log("Starting Ollama...", { installation, canStart, processStatus })
    try {
      await startProcess()
      // Fetch models after starting
      fetchModels()
    } catch (error) {
      console.error("Failed to start Ollama:", error)
    }
  }

  const handleStopOllama = async () => {
    try {
      await stopProcess()
    } catch (error) {
      console.error("Failed to stop Ollama:", error)
    }
  }

  const handleSave = () => {
    // Apply Ollama settings
    settings.setProviderConfig("ollama", {
      endpoint: ollamaEndpoint || undefined,
      numParallel: numParallel,
    });

    // Apply preferences
    settings.setPreferences({
      compactMode,
      showEventNotifications,
      autoApproveReadOnly,
      autoApproveLowRisk,
    });

    onOpenChange(false);
  };

  const handleNumParallelChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) {
      setNumParallel(num);
    } else if (value === "") {
      setNumParallel(1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure your preferences and provider settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="appearance" className="flex-1">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="ollama" className="flex-1">
              Ollama
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1">
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
                        theme === option.value
                          ? "border-primary bg-muted"
                          : "border-muted hover:border-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="text-xs font-medium">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ollama" className="mt-4 space-y-4">
            {/* Process Status Card */}
            <div className="border-border bg-card rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="size-4" />
                  <span className="text-sm font-medium">Process Status</span>
                </div>
                <div className="flex items-center gap-2">
                  {processStatus === "starting" && (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <Loader2 className="size-3 animate-spin" />
                      Starting...
                    </span>
                  )}
                  {processStatus === "stopping" && (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <Loader2 className="size-3 animate-spin" />
                      Stopping...
                    </span>
                  )}
                  {isOllamaConnected ? (
                    <>
                      <span className="rounded border border-emerald-500 bg-emerald-600 px-2 py-0.5 text-xs text-emerald-950">
                        Running
                      </span>
                      {canStop && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleStopOllama}
                          className="h-7 gap-1 px-2"
                        >
                          <Square className="size-3" />
                          Stop
                        </Button>
                      )}
                    </>
                  ) : processStatus !== "starting" &&
                    processStatus !== "stopping" ? (
                    <>
                      <span className="rounded border border-red-500 bg-red-600 px-2 py-0.5 text-xs text-red-950">
                        Stopped
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartOllama}
                        disabled={!canStart}
                        className="h-7 gap-1 px-2"
                      >
                        <Play className="size-3" />
                        Start
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Installation Info */}
              <div className="text-muted-foreground mt-2 border-t border-border pt-2 text-xs">
                {installation ? (
                  <>
                    {installation.installationType === "cli" &&
                      installation.cliPath && (
                        <span>
                          <strong>Installation:</strong> CLI at{" "}
                          {installation.cliPath}
                        </span>
                      )}
                    {installation.installationType === "app" && (
                      <span>
                        <strong>Installation:</strong> Ollama.app
                      </span>
                    )}
                    {installation.installationType === "both" &&
                      installation.cliPath && (
                        <span>
                          <strong>Installation:</strong> CLI at{" "}
                          {installation.cliPath} (App also installed)
                        </span>
                      )}
                    {installation.installationType === "none" && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500">
                          Ollama is not installed.
                        </span>
                        <a
                          href="https://ollama.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sky-500 hover:underline"
                        >
                          Download
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-amber-500">
                    Detecting installation...
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ollama-endpoint">Endpoint</Label>
              <Input
                id="ollama-endpoint"
                placeholder="http://localhost:11434"
                value={ollamaEndpoint}
                onChange={(e) => setOllamaEndpoint(e.target.value)}
              />
              <p className="text-muted-foreground text-[10px]">
                Leave empty to use default (http://localhost:11434)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="num-parallel">Parallel Threads (1-8)</Label>
              <Input
                id="num-parallel"
                type="number"
                min={1}
                max={8}
                value={numParallel}
                onChange={(e) => handleNumParallelChange(e.target.value)}
              />
              <div className="flex items-start gap-2 rounded-lg border border-amber-500 bg-amber-950 p-2">
                <Info className="mt-0.5 size-3 shrink-0 text-amber-500" />
                <p className="text-[10px] text-amber-200">
                  This is a server-side setting. To apply, restart Ollama with:{" "}
                  <code className="rounded bg-amber-900 px-1">
                    OLLAMA_NUM_PARALLEL={numParallel} ollama serve
                  </code>
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode">Compact Mode</Label>
                <p className="text-muted-foreground text-[10px]">
                  Use compact card display
                </p>
              </div>
              <Switch
                id="compact-mode"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="event-notifications">Event Notifications</Label>
                <p className="text-muted-foreground text-[10px]">
                  Show toast notifications for agent events
                </p>
              </div>
              <Switch
                id="event-notifications"
                checked={showEventNotifications}
                onCheckedChange={setShowEventNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-approve-readonly">
                  Auto-approve Read-only
                </Label>
                <p className="text-muted-foreground text-[10px]">
                  Auto-approve read_file, list_files, git_status, etc.
                </p>
              </div>
              <Switch
                id="auto-approve-readonly"
                checked={autoApproveReadOnly}
                onCheckedChange={setAutoApproveReadOnly}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-approve-low-risk">
                  Auto-approve Low Risk
                </Label>
                <p className="text-muted-foreground text-[10px]">
                  Auto-approve low-risk actions in auto mode
                </p>
              </div>
              <Switch
                id="auto-approve-low-risk"
                checked={autoApproveLowRisk}
                onCheckedChange={setAutoApproveLowRisk}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
