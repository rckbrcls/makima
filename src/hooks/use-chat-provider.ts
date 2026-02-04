import { useCallback, useMemo } from 'react'
import { useOllama } from './use-ollama'
import { useOpenAI } from './use-openai'
import { useAnthropic } from './use-anthropic'
import type { ChatMessage, Provider, StreamCompletionStats } from '@/lib/provider-types'

export interface UnifiedChatStreamOptions {
  sessionId: string
  provider: Provider
  model: string
  messages: ChatMessage[]
  apiKey?: string
  system?: string
  temperature?: number
  maxTokens?: number
  onChunk: (content: string, done: boolean) => void
  onError: (error: string) => void
  onComplete?: (stats?: StreamCompletionStats) => void
}

export function useChatProvider() {
  const ollama = useOllama()
  const openai = useOpenAI()
  const anthropic = useAnthropic()

  const isStreaming = useMemo(
    () => ollama.isStreaming || openai.isStreaming || anthropic.isStreaming,
    [ollama.isStreaming, openai.isStreaming, anthropic.isStreaming]
  )

  const startChatStream = useCallback(
    async (options: UnifiedChatStreamOptions) => {
      const {
        sessionId,
        provider,
        model,
        messages,
        apiKey,
        system,
        temperature,
        maxTokens,
        onChunk,
        onError,
        onComplete,
      } = options

      switch (provider) {
        case 'ollama':
          return ollama.startChatStream({
            sessionId,
            model,
            messages,
            temperature,
            maxTokens,
            onChunk,
            onError,
            onComplete: (stats) => {
              onComplete?.({
                totalDuration: stats?.totalDuration,
              })
            },
          })

        case 'openai':
          if (!apiKey) {
            onError('OpenAI API key is required')
            return
          }
          return openai.startChatStream({
            sessionId,
            model,
            messages,
            apiKey,
            temperature,
            maxTokens,
            onChunk,
            onError,
            onComplete,
          })

        case 'anthropic':
          if (!apiKey) {
            onError('Anthropic API key is required')
            return
          }
          return anthropic.startChatStream({
            sessionId,
            model,
            messages,
            apiKey,
            system,
            temperature,
            maxTokens,
            onChunk,
            onError,
            onComplete,
          })

        default:
          onError(`Unknown provider: ${provider}`)
      }
    },
    [ollama, openai, anthropic]
  )

  const cancelStream = useCallback(
    async (provider: Provider) => {
      switch (provider) {
        case 'ollama':
          return ollama.cancelStream()
        case 'openai':
          return openai.cancelStream()
        case 'anthropic':
          return anthropic.cancelStream()
        default:
          return false
      }
    },
    [ollama, openai, anthropic]
  )

  const validateApiKey = useCallback(
    async (provider: Provider, apiKey: string): Promise<boolean> => {
      switch (provider) {
        case 'openai':
          return openai.validateApiKey(apiKey)
        case 'anthropic':
          return anthropic.validateApiKey(apiKey)
        default:
          return true
      }
    },
    [openai, anthropic]
  )

  return {
    isStreaming,
    isValidatingKey: openai.isValidatingKey || anthropic.isValidatingKey,
    startChatStream,
    cancelStream,
    validateApiKey,
    ollama: {
      connectionState: ollama.connectionState,
      models: ollama.models,
      isLoadingModels: ollama.isLoadingModels,
      pullingModel: ollama.pullingModel,
      pullProgress: ollama.pullProgress,
      checkHealth: ollama.checkHealth,
      fetchModels: ollama.fetchModels,
      pullModel: ollama.pullModel,
      deleteModel: ollama.deleteModel,
    },
  }
}
