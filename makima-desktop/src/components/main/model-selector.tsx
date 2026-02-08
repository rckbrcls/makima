import { useCallback, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  HardDrive,
  KeyIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { APIKeyDialog } from "./api-key-dialog";
import type { ModelInfo } from "@/lib/provider-types";
import { POPULAR_MODELS } from "@/lib/ollama-types";
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "@/lib/provider-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NativeMenu,
  createMenuItem,
  createSeparator,
  createSubmenu,
} from "@/components/ui/native-menu";
import { cn } from "@/lib/utils";
// Store imports
import {
  useAnthropicConfigured,
  useIsLoadingModels,
  useOllamaChecking,
  useOllamaConnected,
  useOllamaModels,
  useOpenAIConfigured,
  usePullProgress,
  usePullingModel,
} from "@/stores/provider-store";
import {
  useChatActions,
  useSelectedModel,
  useSelectedProvider,
} from "@/stores/chat-store";
import { useOllamaConnection } from "@/hooks/ollama/use-ollama-connection";
import { useOllamaModelsHook } from "@/hooks/ollama/use-ollama-models";
import { useOllamaPull } from "@/hooks/ollama/use-ollama-pull";

/**
 * ModelSelector - Refactored to use Zustand stores directly.
 *
 * Previously received 14 props:
 * - ollamaModels, selectedModel, selectedProvider, onSelectModel,
 * - isOllamaConnected, isLoadingModels, pullingModel, pullProgress,
 * - onPullModel, onDeleteModel, onRefresh, authStatus,
 * - openaiAuthPreference, anthropicAuthPreference
 *
 * Now accesses all state from stores, eliminating prop drilling.
 */
export function ModelSelector() {
  // Provider store state
  const ollamaModels = useOllamaModels();
  const isOllamaConnected = useOllamaConnected();
  const isOllamaChecking = useOllamaChecking();
  const isLoadingModels = useIsLoadingModels();
  const pullingModel = usePullingModel();
  const pullProgress = usePullProgress();
  const hasOpenAIKey = useOpenAIConfigured();
  const hasAnthropicKey = useAnthropicConfigured();

  // Chat store state
  const selectedModel = useSelectedModel();
  const selectedProvider = useSelectedProvider();
  const { selectModel } = useChatActions();

  // Hooks for actions
  const { checkHealth } = useOllamaConnection();
  const { fetchModels } = useOllamaModelsHook();
  const { pullModel, deleteModel } = useOllamaPull(fetchModels);

  // Reconnect to Ollama
  const handleReconnect = useCallback(async () => {
    const isHealthy = await checkHealth();
    if (isHealthy) {
      await fetchModels();
    }
  }, [checkHealth, fetchModels]);

  // Local UI state
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

  const handleSelectModel = (
    model: string,
    provider: "ollama" | "openai" | "anthropic",
  ) => {
    selectModel(model, provider);
  };

  // Build menu items dynamically
  const menuItems = useMemo(() => {
    const items = [];

    // Ollama models submenu
    const ollamaItems =
      isOllamaConnected && ollamaModels.length > 0
        ? ollamaModels.map((model) =>
            createMenuItem(
              `ollama:${model.name}`,
              selectedModel === model.name && selectedProvider === "ollama"
                ? `✓ ${model.name}`
                : `   ${model.name}`,
            ),
          )
        : [
            createMenuItem("ollama:none", "No models available", {
              enabled: false,
            }),
          ];

    items.push(
      createSubmenu(
        "ollama",
        isOllamaConnected ? "Local (Ollama)" : "Local (Offline)",
        ollamaItems,
        { enabled: isOllamaConnected },
      ),
    );

    items.push(createSeparator());

    // OpenAI models submenu
    const openaiItems = hasOpenAIKey
      ? OPENAI_MODELS.slice(0, 4).map((model) =>
          createMenuItem(
            `openai:${model.id}`,
            selectedModel === model.id && selectedProvider === "openai"
              ? `✓ ${model.name}`
              : `   ${model.name}`,
          ),
        )
      : [createMenuItem("openai:none", "API key required", { enabled: false })];

    items.push(createSubmenu("openai", "OpenAI", openaiItems));

    items.push(createSeparator());

    // Anthropic models submenu
    const anthropicItems = hasAnthropicKey
      ? ANTHROPIC_MODELS.slice(0, 4).map((model) =>
          createMenuItem(
            `anthropic:${model.id}`,
            selectedModel === model.id && selectedProvider === "anthropic"
              ? `✓ ${model.name}`
              : `   ${model.name}`,
          ),
        )
      : [
          createMenuItem("anthropic:none", "API key required", {
            enabled: false,
          }),
        ];

    items.push(createSubmenu("anthropic", "Anthropic", anthropicItems));

    items.push(createSeparator());

    // Actions
    items.push(createMenuItem("manage", "Manage models..."));
    items.push(createMenuItem("api-keys", "Configure API keys..."));

    return items;
  }, [
    isOllamaConnected,
    ollamaModels,
    hasOpenAIKey,
    hasAnthropicKey,
    selectedModel,
    selectedProvider,
  ]);

  const handleMenuSelect = (id: string) => {
    if (id === "manage") {
      setIsManageOpen(true);
      return;
    }

    if (id === "api-keys") {
      openApiKeyDialog("openai");
      return;
    }

    // Parse model selection: "provider:modelId"
    const [provider, modelId] = id.split(":");
    if (provider && modelId && modelId !== "none") {
      handleSelectModel(modelId, provider as "ollama" | "openai" | "anthropic");
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Show reconnect button when Ollama is offline */}
      {!isOllamaConnected && selectedProvider === "ollama" ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-xs"
          onClick={handleReconnect}
          disabled={isOllamaChecking}
        >
          {isOllamaChecking ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="size-3.5 text-red-500" />
              <span className="text-muted-foreground">Offline</span>
              <RefreshCw className="size-3 opacity-50" />
            </>
          )}
        </Button>
      ) : (
        <NativeMenu items={menuItems} onSelect={handleMenuSelect}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            {isLoadingModels ? (
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
        </NativeMenu>
      )}

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
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
                    selectedProvider === "openai" ? selectedModel : undefined
                  }
                  onSelectModel={(model) =>
                    handleSelectModel(model.id, "openai")
                  }
                />
                <ProviderCard
                  name="Anthropic"
                  models={ANTHROPIC_MODELS}
                  isConfigured={hasAnthropicKey}
                  onConfigure={() => openApiKeyDialog("anthropic")}
                  selectedModel={
                    selectedProvider === "anthropic" ? selectedModel : undefined
                  }
                  onSelectModel={(model) =>
                    handleSelectModel(model.id, "anthropic")
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
                        <div className="truncate font-medium">{model.name}</div>
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
                          onClick={() => deleteModel(model.name)}
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
                            onClick={() => pullModel(model.name)}
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
              onClick={fetchModels}
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
