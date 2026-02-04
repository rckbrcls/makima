import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AnthropicStreamChunkEvent,
  AnthropicStreamErrorEvent,
  ChatMessage,
  StreamCompletionStats,
} from '@/lib/provider-types'

export interface AnthropicChatStreamOptions {
  sessionId: string
  model: string
  messages: ChatMessage[]
  apiKey: string
  system?: string
  temperature?: number
  maxTokens?: number
  onChunk: (content: string, done: boolean) => void
  onError: (error: string) => void
  onComplete?: (stats?: StreamCompletionStats) => void
}

export function useAnthropic() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isValidatingKey, setIsValidatingKey] = useState(false)

  const activeSessionRef = useRef<string | null>(null)
  const chunkHandlerRef = useRef<AnthropicChatStreamOptions['onChunk'] | null>(null)
  const errorHandlerRef = useRef<AnthropicChatStreamOptions['onError'] | null>(null)
  const completeHandlerRef = useRef<AnthropicChatStreamOptions['onComplete'] | null>(null)
  const unlistenChunkRef = useRef<UnlistenFn | null>(null)
  const unlistenErrorRef = useRef<UnlistenFn | null>(null)

  const validateApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    setIsValidatingKey(true)
    try {
      const isValid = await invoke<boolean>('anthropic_validate_key', { apiKey })
      return isValid
    } catch (error) {
      console.error('Failed to validate Anthropic API key:', error)
      return false
    } finally {
      setIsValidatingKey(false)
    }
  }, [])

  const startChatStream = useCallback(async (options: AnthropicChatStreamOptions) => {
    const {
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
    } = options

    activeSessionRef.current = sessionId
    chunkHandlerRef.current = onChunk
    errorHandlerRef.current = onError
    completeHandlerRef.current = onComplete ?? null
    setIsStreaming(true)

    // Extract system message from messages if present
    let systemMessage = system
    const filteredMessages = messages.filter((m) => {
      if (m.role === 'system') {
        systemMessage = m.content
        return false
      }
      return true
    })

    try {
      await invoke('anthropic_chat_stream', {
        sessionId,
        model,
        messages: filteredMessages.map((m) => ({ role: m.role, content: m.content })),
        apiKey,
        system: systemMessage,
        temperature,
        maxTokens,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      onError(errorMessage)
      setIsStreaming(false)
      activeSessionRef.current = null
    }
  }, [])

  const cancelStream = useCallback(async () => {
    if (!activeSessionRef.current) return false

    try {
      const wasCancelled = await invoke<boolean>('anthropic_cancel_stream', {
        sessionId: activeSessionRef.current,
      })
      if (wasCancelled) {
        setIsStreaming(false)
        activeSessionRef.current = null
      }
      return wasCancelled
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    const setupListeners = async () => {
      unlistenChunkRef.current = await listen<AnthropicStreamChunkEvent>(
        'anthropic:stream-chunk',
        (event) => {
          const { session_id, content, done, usage } = event.payload

          if (session_id !== activeSessionRef.current) return

          if (chunkHandlerRef.current) {
            chunkHandlerRef.current(content, done)
          }

          if (done) {
            setIsStreaming(false)
            activeSessionRef.current = null
            if (completeHandlerRef.current) {
              completeHandlerRef.current({
                promptTokens: usage?.input_tokens,
                completionTokens: usage?.output_tokens,
                totalTokens: usage
                  ? usage.input_tokens + usage.output_tokens
                  : undefined,
              })
            }
          }
        }
      )

      unlistenErrorRef.current = await listen<AnthropicStreamErrorEvent>(
        'anthropic:stream-error',
        (event) => {
          const { session_id, error } = event.payload

          if (session_id !== activeSessionRef.current) return

          if (errorHandlerRef.current) {
            errorHandlerRef.current(error)
          }

          setIsStreaming(false)
          activeSessionRef.current = null
        }
      )
    }

    setupListeners()

    return () => {
      unlistenChunkRef.current?.()
      unlistenErrorRef.current?.()
    }
  }, [])

  return {
    isStreaming,
    isValidatingKey,
    validateApiKey,
    startChatStream,
    cancelStream,
  }
}
