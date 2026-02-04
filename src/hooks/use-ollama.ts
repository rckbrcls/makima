import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ChatStreamOptions,
  OllamaConnectionState,
  OllamaModelInfo,
  PullProgressEvent,
  StreamChunkEvent,
  StreamErrorEvent,
} from '@/lib/ollama-types'

export function useOllama() {
  const [connectionState, setConnectionState] = useState<OllamaConnectionState>({
    isConnected: false,
    isChecking: true,
  })
  const [models, setModels] = useState<OllamaModelInfo[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [pullingModel, setPullingModel] = useState<string | null>(null)
  const [pullProgress, setPullProgress] = useState<number | null>(null)

  const activeSessionRef = useRef<string | null>(null)
  const chunkHandlerRef = useRef<ChatStreamOptions['onChunk'] | null>(null)
  const errorHandlerRef = useRef<ChatStreamOptions['onError'] | null>(null)
  const completeHandlerRef = useRef<ChatStreamOptions['onComplete'] | null>(null)
  const unlistenChunkRef = useRef<UnlistenFn | null>(null)
  const unlistenErrorRef = useRef<UnlistenFn | null>(null)
  const unlistenPullRef = useRef<UnlistenFn | null>(null)

  const checkHealth = useCallback(async () => {
    setConnectionState((prev) => ({ ...prev, isChecking: true }))
    try {
      const isHealthy = await invoke<boolean>('ollama_health_check')
      setConnectionState({
        isConnected: isHealthy,
        isChecking: false,
        lastError: isHealthy ? undefined : 'Ollama is not responding',
      })
      return isHealthy
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setConnectionState({
        isConnected: false,
        isChecking: false,
        lastError: errorMessage,
      })
      return false
    }
  }, [])

  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true)
    try {
      const modelList = await invoke<OllamaModelInfo[]>('ollama_list_models')
      setModels(modelList)
      return modelList
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        lastError: errorMessage,
      }))
      return []
    } finally {
      setIsLoadingModels(false)
    }
  }, [])

  const startChatStream = useCallback(
    async (options: ChatStreamOptions) => {
      const { sessionId, model, messages, temperature, maxTokens, onChunk, onError, onComplete } =
        options

      activeSessionRef.current = sessionId
      chunkHandlerRef.current = onChunk
      errorHandlerRef.current = onError
      completeHandlerRef.current = onComplete ?? null
      setIsStreaming(true)

      try {
        await invoke('ollama_chat_stream', {
          sessionId,
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature,
          maxTokens,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        onError(errorMessage)
        setIsStreaming(false)
        activeSessionRef.current = null
      }
    },
    [],
  )

  const cancelStream = useCallback(async () => {
    if (!activeSessionRef.current) return false

    try {
      const wasCancelled = await invoke<boolean>('ollama_cancel_stream', {
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

  const pullModel = useCallback(async (modelName: string) => {
    setPullingModel(modelName)
    setPullProgress(0)

    try {
      await invoke('ollama_pull_model', { model: modelName })
      await fetchModels()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to pull model:', errorMessage)
    } finally {
      setPullingModel(null)
      setPullProgress(null)
    }
  }, [fetchModels])

  const deleteModel = useCallback(async (modelName: string) => {
    try {
      await invoke('ollama_delete_model', { model: modelName })
      await fetchModels()
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Failed to delete model:', errorMessage)
      return false
    }
  }, [fetchModels])

  useEffect(() => {
    const setupListeners = async () => {
      unlistenChunkRef.current = await listen<StreamChunkEvent>(
        'ollama:stream-chunk',
        (event) => {
          const { session_id, content, done, total_duration, eval_count } = event.payload

          if (session_id !== activeSessionRef.current) return

          if (chunkHandlerRef.current) {
            chunkHandlerRef.current(content, done)
          }

          if (done) {
            setIsStreaming(false)
            activeSessionRef.current = null
            if (completeHandlerRef.current) {
              completeHandlerRef.current({
                totalDuration: total_duration,
                evalCount: eval_count,
              })
            }
          }
        },
      )

      unlistenErrorRef.current = await listen<StreamErrorEvent>(
        'ollama:stream-error',
        (event) => {
          const { session_id, error } = event.payload

          if (session_id !== activeSessionRef.current) return

          if (errorHandlerRef.current) {
            errorHandlerRef.current(error)
          }

          setIsStreaming(false)
          activeSessionRef.current = null
        },
      )

      unlistenPullRef.current = await listen<PullProgressEvent>(
        'ollama:pull-progress',
        (event) => {
          const { progress, done } = event.payload
          if (progress !== undefined && progress !== null) {
            setPullProgress(progress)
          }
          if (done) {
            setPullingModel(null)
            setPullProgress(null)
          }
        },
      )
    }

    setupListeners()

    return () => {
      unlistenChunkRef.current?.()
      unlistenErrorRef.current?.()
      unlistenPullRef.current?.()
    }
  }, [])

  useEffect(() => {
    checkHealth().then((isHealthy) => {
      if (isHealthy) {
        fetchModels()
      }
    })
  }, [checkHealth, fetchModels])

  return {
    connectionState,
    models,
    isLoadingModels,
    isStreaming,
    pullingModel,
    pullProgress,
    checkHealth,
    fetchModels,
    startChatStream,
    cancelStream,
    pullModel,
    deleteModel,
  }
}
