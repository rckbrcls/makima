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

interface SessionHandlers {
  onChunk: OpenAIChatStreamOptions['onChunk']
  onError: OpenAIChatStreamOptions['onError']
  onComplete?: OpenAIChatStreamOptions['onComplete']
}

export function useOpenAI() {
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set())
  const [isValidatingKey, setIsValidatingKey] = useState(false)

  const sessionsRef = useRef<Map<string, SessionHandlers>>(new Map())
  const unlistenChunkRef = useRef<UnlistenFn | null>(null)
  const unlistenErrorRef = useRef<UnlistenFn | null>(null)

  const isStreaming = activeSessions.size > 0

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

    // Register handlers for this session
    sessionsRef.current.set(sessionId, { onChunk, onError, onComplete })
    setActiveSessions((prev) => new Set(prev).add(sessionId))

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
      sessionsRef.current.delete(sessionId)
      setActiveSessions((prev) => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }, [])

  const cancelStream = useCallback(async (sessionId: string) => {
    if (!sessionsRef.current.has(sessionId)) return false

    try {
      const wasCancelled = await invoke<boolean>('openai_cancel_stream', {
        sessionId,
      })
      if (wasCancelled) {
        sessionsRef.current.delete(sessionId)
        setActiveSessions((prev) => {
          const next = new Set(prev)
          next.delete(sessionId)
          return next
        })
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

          const handlers = sessionsRef.current.get(session_id)
          if (!handlers) return

          handlers.onChunk(content, done)

          if (done) {
            sessionsRef.current.delete(session_id)
            setActiveSessions((prev) => {
              const next = new Set(prev)
              next.delete(session_id)
              return next
            })
            if (handlers.onComplete) {
              handlers.onComplete({
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

          const handlers = sessionsRef.current.get(session_id)
          if (!handlers) return

          handlers.onError(error)

          sessionsRef.current.delete(session_id)
          setActiveSessions((prev) => {
            const next = new Set(prev)
            next.delete(session_id)
            return next
          })
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
    activeSessions,
    isValidatingKey,
    validateApiKey,
    startChatStream,
    cancelStream,
  }
}
