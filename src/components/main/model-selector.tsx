import { useState } from "react"
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  HardDrive,
  Loader2,
  Settings2,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react"
import type { OllamaModelInfo } from "@/lib/ollama-types"
import { POPULAR_MODELS } from "@/lib/ollama-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ModelSelectorProps {
  models: OllamaModelInfo[]
  selectedModel: string
  onSelectModel: (model: string) => void
  isConnected: boolean
  isLoadingModels: boolean
  pullingModel: string | null
  pullProgress: number | null
  onPullModel: (model: string) => void
  onDeleteModel: (model: string) => void
  onRefresh: () => void
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  isConnected,
  isLoadingModels,
  pullingModel,
  pullProgress,
  onPullModel,
  onDeleteModel,
  onRefresh,
}: ModelSelectorProps) {
  const [isManageOpen, setIsManageOpen] = useState(false)

  const downloadedModelNames = new Set(models.map((m) => m.name.split(":")[0]))

  const formatSize = (bytes?: number) => {
    if (!bytes) return ""
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)}GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)}MB`
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full text-xs h-8 px-3"
            disabled={!isConnected || isLoadingModels}
          >
            {!isConnected ? (
              <>
                <WifiOff className="size-3.5 text-red-500" />
                <span className="text-muted-foreground">Offline</span>
              </>
            ) : isLoadingModels ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <HardDrive className="size-3.5" />
                <span className="max-w-[100px] truncate">
                  {selectedModel || "Select model"}
                </span>
                <ChevronDown className="size-3.5 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {models.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No models installed
            </div>
          ) : (
            models.map((model) => (
              <DropdownMenuItem
                key={model.name}
                onClick={() => onSelectModel(model.name)}
                className="gap-2 rounded-none"
              >
                {selectedModel === model.name && (
                  <Check className="size-4 text-emerald-500" />
                )}
                {selectedModel !== model.name && <div className="size-4" />}
                <span className="flex-1 truncate">{model.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSize(model.size)}
                </span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem className="rounded-none" onSelect={(e) => e.preventDefault()}>
                <Settings2 className="size-4 mr-2" />
                Manage models...
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cloud className="size-5" />
                  Model Library
                </DialogTitle>
                <DialogDescription>
                  Download and manage your local Ollama models
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {models.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <HardDrive className="size-4" />
                      Installed ({models.length})
                    </h3>
                    <div className="space-y-2">
                      {models.map((model) => (
                        <div
                          key={model.name}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {model.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatSize(model.size)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedModel === model.name && (
                              <span className="text-xs border border-emerald-500 bg-emerald-600 text-emerald-950 px-2 py-0.5 rounded">
                                Active
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-red-500"
                              onClick={() => onDeleteModel(model.name)}
                              disabled={pullingModel !== null}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Cloud className="size-4" />
                    Available to Download
                  </h3>
                  <div className="space-y-2">
                    {POPULAR_MODELS.map((model) => {
                      const isInstalled = downloadedModelNames.has(
                        model.name.split(":")[0]
                      )
                      const isPulling = pullingModel === model.name

                      return (
                        <div
                          key={model.name}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border border-border",
                            isInstalled
                              ? "bg-muted/50 opacity-60"
                              : "bg-card"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {model.description}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {model.size}
                              </span>
                              {model.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs border border-sky-500 bg-sky-600 text-sky-950 px-1.5 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {isInstalled ? (
                              <span className="text-xs border border-emerald-500 bg-emerald-600 text-emerald-950 px-2 py-0.5 rounded flex items-center gap-1">
                                <Check className="size-3" />
                                Installed
                              </span>
                            ) : isPulling ? (
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-sky-500 transition-all duration-300"
                                    style={{
                                      width: `${pullProgress ?? 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-12">
                                  {(pullProgress ?? 0).toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => onPullModel(model.name)}
                                disabled={pullingModel !== null}
                              >
                                <Download className="size-3.5" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoadingModels}
                  className="gap-1.5"
                >
                  {isLoadingModels ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wifi className="size-3.5" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManageOpen(false)}
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
