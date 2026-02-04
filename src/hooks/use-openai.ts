import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ChatMessage,
  OpenAIStreamChunkEvent,
  OpenAIStreamErrorEvent,
  StreamCompletionStats,
} from '@/lib/provider-types'

export interface OpenAIChatStreamOptions {
  sessionId: string
  model: string
  messages: ChatMessage[]
  apiKey: string
  temperature?: number
  maxTokens?: number
  onChunk: (content: string, done: boolean) => void
  onError: (error: string) => void
  onComplete?: (stats?: StreamCompletionStats) => void
}

export function useOpenAI() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isValidatingKey, setIsValidatingKey] = useState(false)

  const activeSessionRef = useRef<string | null>(null)
  const chunkHandlerRef = useRef<OpenAIChatStreamOptions['onChunk'] | null>(null)
  const errorHandlerRef = useRef<OpenAIChatStreamOptions['onError'] | null>(null)
  const completeHandlerRef = useRef<OpenAIChatStreamOptions['onComplete'] | null>(null)
  const unlistenChunkRef = useRef<UnlistenFn | null>(null)
  const unlistenErrorRef = useRef<UnlistenFn | null>(null)

  const validateApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    setIsValidatingKey(true)
    try {
      const isValid = await invoke<boolean>('openai_validate_key', { apiKey })
      return isValid
    } catch (error) {
      console.error('Failed to validate OpenAI API key:', error)
      return false
    } finally {
      setIsValidatingKey(false)
    }
  }, [])

  const startChatStream = useCallback(async (options: OpenAIChatStreamOptions) => {
    const { sessionId, model, messages, apiKey, temperature, maxTokens, onChunk, onError, onComplete } =
      options

    activeSessionRef.current = sessionId
    chunkHandlerRef.current = onChunk
    errorHandlerRef.current = onError
    completeHandlerRef.current = onComplete ?? null
    setIsStreaming(true)

    try {
      await invoke('openai_chat_stream', {
        sessionId,
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        apiKey,
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
      const wasCancelled = await invoke<boolean>('openai_cancel_stream', {
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
      unlistenChunkRef.current = await listen<OpenAIStreamChunkEvent>(
        'openai:stream-chunk',
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
                promptTokens: usage?.prompt_tokens,
                completionTokens: usage?.completion_tokens,
                totalTokens: usage?.total_tokens,
              })
            }
          }
        }
      )

      unlistenErrorRef.current = await listen<OpenAIStreamErrorEvent>(
        'openai:stream-error',
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
