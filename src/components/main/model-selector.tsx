import { useState } from "react";
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  HardDrive,
  KeyIcon,
  Loader2,
  Settings2,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { APIKeyDialog } from "./api-key-dialog";
import type { OllamaModelInfo } from "@/lib/ollama-types";
import type { ModelInfo, Provider } from "@/lib/provider-types";
import type { AuthSourcePreference, AuthStatus } from "@/lib/auth-types";
import { POPULAR_MODELS } from "@/lib/ollama-types";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "@/lib/provider-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  ollamaModels: Array<OllamaModelInfo>;
  selectedModel: string;
  selectedProvider: Provider;
  onSelectModel: (model: string, provider: Provider) => void;
  isOllamaConnected: boolean;
  isLoadingModels: boolean;
  pullingModel: string | null;
  pullProgress: number | null;
  onPullModel: (model: string) => void;
  onDeleteModel: (model: string) => void;
  onRefresh: () => void;
  authStatus?: AuthStatus | null;
  openaiAuthPreference?: AuthSourcePreference;
  anthropicAuthPreference?: AuthSourcePreference;
}

export function ModelSelector({
  ollamaModels,
  selectedModel,
  selectedProvider,
  onSelectModel,
  isOllamaConnected,
  isLoadingModels,
  pullingModel,
  pullProgress,
  onPullModel,
  onDeleteModel,
  onRefresh,
  authStatus,
  openaiAuthPreference = "auto",
  anthropicAuthPreference = "auto",
}: ModelSelectorProps) {
  const hasOpenAIKey = authStatus?.openai.is_configured ?? false;
  const hasAnthropicKey = authStatus?.anthropic.is_configured ?? false;
  const anthropicSource = authStatus?.anthropic.source;
  const openaiSource = authStatus?.openai.source;

  // Determine what badge to show based on preference
  // If preference is 'auto', show detected source. Otherwise show the selected preference.
  const getOpenAIBadgeSource = () => {
    if (openaiAuthPreference === "auto") return openaiSource;
    return openaiAuthPreference;
  };

  const getAnthropicBadgeSource = () => {
    if (anthropicAuthPreference === "auto") return anthropicSource;
    return anthropicAuthPreference;
  };

  const openaiDisplaySource = getOpenAIBadgeSource();
  const anthropicDisplaySource = getAnthropicBadgeSource();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [apiKeyInitialTab, setApiKeyInitialTab] = useState<
    "openai" | "anthropic"
  >("openai");

  const downloadedModelNames = new Set(
    ollamaModels.map((m) => m.name.split(":")[0]),
  );

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)}GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)}MB`;
  };

  const getDisplayName = () => {
    if (selectedProvider === "ollama") {
      return selectedModel || "Select model";
    }
    const model =
      selectedProvider === "openai"
        ? OPENAI_MODELS.find((m) => m.id === selectedModel)
        : ANTHROPIC_MODELS.find((m) => m.id === selectedModel);
    return model?.name || selectedModel || "Select model";
  };

  const getProviderIcon = () => {
    switch (selectedProvider) {
      case "ollama":
        return <HardDrive className="size-3.5" />;
      case "openai":
      case "anthropic":
        return <Cloud className="size-3.5" />;
    }
  };

  const openApiKeyDialog = (tab: "openai" | "anthropic") => {
    setApiKeyInitialTab(tab);
    setIsApiKeyOpen(true);
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            {!isOllamaConnected && selectedProvider === "ollama" ? (
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
                {getProviderIcon()}
                <span className="max-w-[120px] truncate">
                  {getDisplayName()}
                </span>
                <ChevronDown className="size-3.5 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* Ollama Models Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <HardDrive className="size-3.5" />
            Local (Ollama)
            {!isOllamaConnected && (
              <span className="ml-auto text-xs text-red-500">Offline</span>
            )}
          </DropdownMenuLabel>
          {isOllamaConnected && ollamaModels.length > 0 ? (
            ollamaModels.map((model) => (
              <DropdownMenuItem
                key={`ollama-${model.name}`}
                onClick={() => onSelectModel(model.name, "ollama")}
                className="gap-2"
              >
                {selectedModel === model.name &&
                selectedProvider === "ollama" ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <div className="size-4" />
                )}
                <span className="flex-1 truncate">{model.name}</span>
                <span className="text-muted-foreground text-xs">
                  {formatSize(model.size)}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              {isOllamaConnected ? "No models installed" : "Not connected"}
            </div>
          )}

          <DropdownMenuSeparator />

          {/* OpenAI Models Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <Cloud className="size-3.5" />
            OpenAI
            {hasOpenAIKey && openaiDisplaySource === "environment" && (
              <span className="ml-auto rounded border border-amber-500 bg-amber-600 px-1.5 py-0.5 text-xs text-amber-950">
                ENV
              </span>
            )}
            {hasOpenAIKey && openaiDisplaySource === "manual" && (
              <span className="ml-auto rounded border border-sky-500 bg-sky-600 px-1.5 py-0.5 text-xs text-sky-950">
                API Key
              </span>
            )}
            {!hasOpenAIKey && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-5 px-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  openApiKeyDialog("openai");
                }}
              >
                <KeyIcon className="mr-1 size-3" />
                Set Key
              </Button>
            )}
          </DropdownMenuLabel>
          {hasOpenAIKey ? (
            OPENAI_MODELS.slice(0, 4).map((model) => (
              <DropdownMenuItem
                key={`openai-${model.id}`}
                onClick={() => onSelectModel(model.id, "openai")}
                className="gap-2"
              >
                {selectedModel === model.id && selectedProvider === "openai" ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <div className="size-4" />
                )}
                <span className="flex-1 truncate">{model.name}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              API key required
            </div>
          )}

          <DropdownMenuSeparator />

          {/* Anthropic Models Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <Cloud className="size-3.5" />
            Anthropic
            {hasAnthropicKey && anthropicDisplaySource === "environment" && (
              <span className="ml-auto rounded border border-amber-500 bg-amber-600 px-1.5 py-0.5 text-xs text-amber-950">
                ENV
              </span>
            )}
            {hasAnthropicKey && anthropicDisplaySource === "manual" && (
              <span className="ml-auto rounded border border-sky-500 bg-sky-600 px-1.5 py-0.5 text-xs text-sky-950">
                API Key
              </span>
            )}
            {!hasAnthropicKey && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-5 px-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  openApiKeyDialog("anthropic");
                }}
              >
                <KeyIcon className="mr-1 size-3" />
                Set Key
              </Button>
            )}
          </DropdownMenuLabel>
          {hasAnthropicKey ? (
            ANTHROPIC_MODELS.slice(0, 4).map((model) => (
              <DropdownMenuItem
                key={`anthropic-${model.id}`}
                onClick={() => onSelectModel(model.id, "anthropic")}
                className="gap-2"
              >
                {selectedModel === model.id &&
                selectedProvider === "anthropic" ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <div className="size-4" />
                )}
                <span className="flex-1 truncate">{model.name}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              API key required
            </div>
          )}

          <DropdownMenuSeparator />

          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Settings2 className="mr-2 size-4" />
                Manage models...
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cloud className="size-5" />
                  Model Library
                </DialogTitle>
                <DialogDescription>
                  Download local models and configure cloud providers
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                {/* Cloud Providers */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Cloud className="size-4" />
                    Cloud Providers
                  </h3>
                  <div className="space-y-2">
                    <ProviderCard
                      name="OpenAI"
                      models={OPENAI_MODELS}
                      isConfigured={hasOpenAIKey}
                      onConfigure={() => openApiKeyDialog("openai")}
                      selectedModel={
                        selectedProvider === "openai"
                          ? selectedModel
                          : undefined
                      }
                      onSelectModel={(model) =>
                        onSelectModel(model.id, "openai")
                      }
                    />
                    <ProviderCard
                      name="Anthropic"
                      models={ANTHROPIC_MODELS}
                      isConfigured={hasAnthropicKey}
                      onConfigure={() => openApiKeyDialog("anthropic")}
                      selectedModel={
                        selectedProvider === "anthropic"
                          ? selectedModel
                          : undefined
                      }
                      onSelectModel={(model) =>
                        onSelectModel(model.id, "anthropic")
                      }
                    />
                  </div>
                </div>

                {/* Installed Ollama Models */}
                {ollamaModels.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <HardDrive className="size-4" />
                      Installed Local Models ({ollamaModels.length})
                    </h3>
                    <div className="space-y-2">
                      {ollamaModels.map((model) => (
                        <div
                          key={model.name}
                          className="border-border bg-card flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">
                              {model.name}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatSize(model.size)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedModel === model.name &&
                              selectedProvider === "ollama" && (
                                <span className="rounded border border-emerald-500 bg-emerald-600 px-2 py-0.5 text-xs text-emerald-950">
                                  Active
                                </span>
                              )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground size-8 hover:text-red-500"
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

                {/* Available to Download */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Download className="size-4" />
                    Available to Download (Ollama)
                  </h3>
                  <div className="space-y-2">
                    {POPULAR_MODELS.map((model) => {
                      const isInstalled = downloadedModelNames.has(
                        model.name.split(":")[0],
                      );
                      const isPulling = pullingModel === model.name;

                      return (
                        <div
                          key={model.name}
                          className={cn(
                            "border-border flex items-center justify-between rounded-lg border p-3",
                            isInstalled ? "bg-muted/50 opacity-60" : "bg-card",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-muted-foreground text-xs">
                              {model.description}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">
                                {model.size}
                              </span>
                              {model.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded border border-sky-500 bg-sky-600 px-1.5 py-0.5 text-xs text-sky-950"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="ml-4 flex items-center gap-2">
                            {isInstalled ? (
                              <span className="flex items-center gap-1 rounded border border-emerald-500 bg-emerald-600 px-2 py-0.5 text-xs text-emerald-950">
                                <Check className="size-3" />
                                Installed
                              </span>
                            ) : isPulling ? (
                              <div className="flex items-center gap-2">
                                <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
                                  <div
                                    className="h-full bg-sky-500 transition-all duration-300"
                                    style={{
                                      width: `${pullProgress ?? 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-muted-foreground w-12 text-xs">
                                  {(pullProgress ?? 0).toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => onPullModel(model.name)}
                                disabled={
                                  pullingModel !== null || !isOllamaConnected
                                }
                              >
                                <Download className="size-3.5" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-border flex items-center justify-between border-t pt-4">
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

          <DropdownMenuItem onClick={() => openApiKeyDialog("openai")}>
            <KeyIcon className="mr-2 size-4" />
            Configure API keys...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <APIKeyDialog
        open={isApiKeyOpen}
        onOpenChange={setIsApiKeyOpen}
        initialTab={apiKeyInitialTab}
      />
    </div>
  );
}

interface ProviderCardProps {
  name: string;
  models: Array<ModelInfo>;
  isConfigured: boolean;
  onConfigure: () => void;
  selectedModel?: string;
  onSelectModel: (model: ModelInfo) => void;
}

function ProviderCard({
  name,
  models,
  isConfigured,
  onConfigure,
  selectedModel,
  onSelectModel,
}: ProviderCardProps) {
  return (
    <div className="border-border bg-card rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium">{name}</div>
        {isConfigured ? (
          <span className="flex items-center gap-1 rounded border border-emerald-500 bg-emerald-600 px-2 py-0.5 text-xs text-emerald-950">
            <Check className="size-3" />
            Configured
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onConfigure}
          >
            <KeyIcon className="size-3.5" />
            Set API Key
          </Button>
        )}
      </div>
      {isConfigured && (
        <div className="mt-2 space-y-1">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => onSelectModel(model)}
              className={cn(
                "hover:bg-muted/50 flex w-full items-center gap-2 rounded p-2 text-left text-xs transition-colors",
                selectedModel === model.id && "bg-muted",
              )}
            >
              {selectedModel === model.id ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <div className="size-3" />
              )}
              <span className="flex-1">{model.name}</span>
              {model.description && (
                <span className="text-muted-foreground max-w-[150px] truncate">
                  {model.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
