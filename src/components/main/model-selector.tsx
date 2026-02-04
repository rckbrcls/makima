import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  HardDrive,
  KeyIcon,
  Loader2,
  Settings2,
  TerminalIcon,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { OllamaModelInfo } from '@/lib/ollama-types'
import { POPULAR_MODELS } from '@/lib/ollama-types'
import type { ModelInfo, Provider } from '@/lib/provider-types'
import { OPENAI_MODELS, ANTHROPIC_MODELS } from '@/lib/provider-types'
import type { AuthStatus } from '@/lib/auth-types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { APIKeyDialog } from './api-key-dialog'

interface ModelSelectorProps {
  ollamaModels: OllamaModelInfo[]
  selectedModel: string
  selectedProvider: Provider
  onSelectModel: (model: string, provider: Provider) => void
  isOllamaConnected: boolean
  isLoadingModels: boolean
  pullingModel: string | null
  pullProgress: number | null
  onPullModel: (model: string) => void
  onDeleteModel: (model: string) => void
  onRefresh: () => void
  authStatus?: AuthStatus | null
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
}: ModelSelectorProps) {
  const hasOpenAIKey = authStatus?.openai.is_configured ?? false
  const hasAnthropicKey = authStatus?.anthropic.is_configured ?? false
  const anthropicSource = authStatus?.anthropic.source
  const openaiSource = authStatus?.openai.source
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false)
  const [apiKeyInitialTab, setApiKeyInitialTab] = useState<'openai' | 'anthropic'>('openai')

  const downloadedModelNames = new Set(ollamaModels.map((m) => m.name.split(':')[0]))

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)}GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)}MB`
  }

  const getDisplayName = () => {
    if (selectedProvider === 'ollama') {
      return selectedModel || 'Select model'
    }
    const model =
      selectedProvider === 'openai'
        ? OPENAI_MODELS.find((m) => m.id === selectedModel)
        : ANTHROPIC_MODELS.find((m) => m.id === selectedModel)
    return model?.name || selectedModel || 'Select model'
  }

  const getProviderIcon = () => {
    switch (selectedProvider) {
      case 'ollama':
        return <HardDrive className="size-3.5" />
      case 'openai':
      case 'anthropic':
        return <Cloud className="size-3.5" />
    }
  }

  const openApiKeyDialog = (tab: 'openai' | 'anthropic') => {
    setApiKeyInitialTab(tab)
    setIsApiKeyOpen(true)
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs h-8 px-3">
            {!isOllamaConnected && selectedProvider === 'ollama' ? (
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
                <span className="max-w-[120px] truncate">{getDisplayName()}</span>
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
                onClick={() => onSelectModel(model.name, 'ollama')}
                className="gap-2"
              >
                {selectedModel === model.name && selectedProvider === 'ollama' ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <div className="size-4" />
                )}
                <span className="flex-1 truncate">{model.name}</span>
                <span className="text-xs text-muted-foreground">{formatSize(model.size)}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {isOllamaConnected ? 'No models installed' : 'Not connected'}
            </div>
          )}

          <DropdownMenuSeparator />

          {/* OpenAI Models Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <Cloud className="size-3.5" />
            OpenAI
            {hasOpenAIKey && openaiSource === 'environment' && (
              <span className="ml-auto text-xs border border-amber-500 bg-amber-600 text-amber-950 px-1.5 py-0.5 rounded">
                ENV
              </span>
            )}
            {!hasOpenAIKey && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-5 px-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  openApiKeyDialog('openai')
                }}
              >
                <KeyIcon className="size-3 mr-1" />
                Set Key
              </Button>
            )}
          </DropdownMenuLabel>
          {hasOpenAIKey ? (
            OPENAI_MODELS.slice(0, 4).map((model) => (
              <DropdownMenuItem
                key={`openai-${model.id}`}
                onClick={() => onSelectModel(model.id, 'openai')}
                className="gap-2"
              >
                {selectedModel === model.id && selectedProvider === 'openai' ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <div className="size-4" />
                )}
                <span className="flex-1 truncate">{model.name}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">API key required</div>
          )}

          <DropdownMenuSeparator />

          {/* Anthropic Models Section */}
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <Cloud className="size-3.5" />
            Anthropic
            {hasAnthropicKey && anthropicSource === 'claude_code_keychain' && (
              <span className="ml-auto text-xs border border-violet-500 bg-violet-600 text-violet-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                <TerminalIcon className="size-2.5" />
                Claude Code
              </span>
            )}
            {hasAnthropicKey && anthropicSource === 'environment' && (
              <span className="ml-auto text-xs border border-amber-500 bg-amber-600 text-amber-950 px-1.5 py-0.5 rounded">
                ENV
              </span>
            )}
            {!hasAnthropicKey && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-5 px-1.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  openApiKeyDialog('anthropic')
                }}
              >
                <KeyIcon className="size-3 mr-1" />
                Set Key
              </Button>
            )}
          </DropdownMenuLabel>
          {hasAnthropicKey ? (
            ANTHROPIC_MODELS.slice(0, 4).map((model) => (
              <DropdownMenuItem
                key={`anthropic-${model.id}`}
                onClick={() => onSelectModel(model.id, 'anthropic')}
                className="gap-2"
              >
                {selectedModel === model.id && selectedProvider === 'anthropic' ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <div className="size-4" />
                )}
                <span className="flex-1 truncate">{model.name}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">API key required</div>
          )}

          <DropdownMenuSeparator />

          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
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
                  Download local models and configure cloud providers
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Cloud Providers */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Cloud className="size-4" />
                    Cloud Providers
                  </h3>
                  <div className="space-y-2">
                    <ProviderCard
                      name="OpenAI"
                      models={OPENAI_MODELS}
                      isConfigured={hasOpenAIKey}
                      onConfigure={() => openApiKeyDialog('openai')}
                      selectedModel={selectedProvider === 'openai' ? selectedModel : undefined}
                      onSelectModel={(model) => onSelectModel(model.id, 'openai')}
                    />
                    <ProviderCard
                      name="Anthropic"
                      models={ANTHROPIC_MODELS}
                      isConfigured={hasAnthropicKey}
                      onConfigure={() => openApiKeyDialog('anthropic')}
                      selectedModel={selectedProvider === 'anthropic' ? selectedModel : undefined}
                      onSelectModel={(model) => onSelectModel(model.id, 'anthropic')}
                    />
                  </div>
                </div>

                {/* Installed Ollama Models */}
                {ollamaModels.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <HardDrive className="size-4" />
                      Installed Local Models ({ollamaModels.length})
                    </h3>
                    <div className="space-y-2">
                      {ollamaModels.map((model) => (
                        <div
                          key={model.name}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{model.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatSize(model.size)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedModel === model.name && selectedProvider === 'ollama' && (
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

                {/* Available to Download */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Download className="size-4" />
                    Available to Download (Ollama)
                  </h3>
                  <div className="space-y-2">
                    {POPULAR_MODELS.map((model) => {
                      const isInstalled = downloadedModelNames.has(model.name.split(':')[0])
                      const isPulling = pullingModel === model.name

                      return (
                        <div
                          key={model.name}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border border-border',
                            isInstalled ? 'bg-muted/50 opacity-60' : 'bg-card'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">{model.size}</span>
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
                                disabled={pullingModel !== null || !isOllamaConnected}
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
                <Button variant="outline" size="sm" onClick={() => setIsManageOpen(false)}>
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenuItem onClick={() => openApiKeyDialog('openai')}>
            <KeyIcon className="size-4 mr-2" />
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
  )
}

interface ProviderCardProps {
  name: string
  models: ModelInfo[]
  isConfigured: boolean
  onConfigure: () => void
  selectedModel?: string
  onSelectModel: (model: ModelInfo) => void
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
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{name}</div>
        {isConfigured ? (
          <span className="text-xs border border-emerald-500 bg-emerald-600 text-emerald-950 px-2 py-0.5 rounded flex items-center gap-1">
            <Check className="size-3" />
            Configured
          </span>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onConfigure}>
            <KeyIcon className="size-3.5" />
            Set API Key
          </Button>
        )}
      </div>
      {isConfigured && (
        <div className="space-y-1 mt-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => onSelectModel(model)}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded text-left text-xs hover:bg-muted/50 transition-colors',
                selectedModel === model.id && 'bg-muted'
              )}
            >
              {selectedModel === model.id ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <div className="size-3" />
              )}
              <span className="flex-1">{model.name}</span>
              {model.description && (
                <span className="text-muted-foreground truncate max-w-[150px]">
                  {model.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
