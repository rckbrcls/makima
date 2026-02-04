import { useState, useCallback } from 'react'
import { CheckIcon, KeyIcon, Loader2Icon, XIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useSettingsStore } from '@/stores/settings-store'
import { useChatProvider } from '@/hooks/use-chat-provider'
import type { Provider } from '@/lib/provider-types'

interface APIKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: 'openai' | 'anthropic'
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export function APIKeyDialog({ open, onOpenChange, initialTab = 'openai' }: APIKeyDialogProps) {
  const { providers, setProviderConfig } = useSettingsStore()
  const { validateApiKey } = useChatProvider()

  const [activeTab, setActiveTab] = useState<'openai' | 'anthropic'>(initialTab)
  const [openaiKey, setOpenaiKey] = useState(providers.openai.apiKey ?? '')
  const [anthropicKey, setAnthropicKey] = useState(providers.anthropic.apiKey ?? '')
  const [openaiStatus, setOpenaiStatus] = useState<ValidationStatus>('idle')
  const [anthropicStatus, setAnthropicStatus] = useState<ValidationStatus>('idle')

  const handleTestConnection = useCallback(
    async (provider: 'openai' | 'anthropic') => {
      const key = provider === 'openai' ? openaiKey : anthropicKey
      const setStatus = provider === 'openai' ? setOpenaiStatus : setAnthropicStatus

      if (!key.trim()) {
        setStatus('invalid')
        return
      }

      setStatus('validating')
      const isValid = await validateApiKey(provider as Provider, key)
      setStatus(isValid ? 'valid' : 'invalid')
    },
    [openaiKey, anthropicKey, validateApiKey]
  )

  const handleSave = useCallback(() => {
    if (openaiKey.trim()) {
      setProviderConfig('openai', { enabled: true, apiKey: openaiKey.trim() })
    } else {
      setProviderConfig('openai', { enabled: false, apiKey: undefined })
    }

    if (anthropicKey.trim()) {
      setProviderConfig('anthropic', { enabled: true, apiKey: anthropicKey.trim() })
    } else {
      setProviderConfig('anthropic', { enabled: false, apiKey: undefined })
    }

    onOpenChange(false)
  }, [openaiKey, anthropicKey, setProviderConfig, onOpenChange])

  const renderStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'validating':
        return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      case 'valid':
        return <CheckIcon className="size-4 text-emerald-500" />
      case 'invalid':
        return <XIcon className="size-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyIcon className="size-4" />
            API Keys
          </DialogTitle>
          <DialogDescription>
            Configure your API keys to use cloud models from OpenAI and Anthropic.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'openai' | 'anthropic')}>
          <TabsList className="w-full">
            <TabsTrigger value="openai" className="flex-1">
              OpenAI
            </TabsTrigger>
            <TabsTrigger value="anthropic" className="flex-1">
              Anthropic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="openai" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => {
                    setOpenaiKey(e.target.value)
                    setOpenaiStatus('idle')
                  }}
                />
                {renderStatusIcon(openaiStatus)}
              </div>
              <p className="text-muted-foreground text-xs">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  platform.openai.com
                </a>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection('openai')}
              disabled={!openaiKey.trim() || openaiStatus === 'validating'}
            >
              {openaiStatus === 'validating' ? (
                <>
                  <Loader2Icon className="mr-2 size-3 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="anthropic" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="anthropic-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => {
                    setAnthropicKey(e.target.value)
                    setAnthropicStatus('idle')
                  }}
                />
                {renderStatusIcon(anthropicStatus)}
              </div>
              <p className="text-muted-foreground text-xs">
                Get your API key from{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestConnection('anthropic')}
              disabled={!anthropicKey.trim() || anthropicStatus === 'validating'}
            >
              {anthropicStatus === 'validating' ? (
                <>
                  <Loader2Icon className="mr-2 size-3 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
