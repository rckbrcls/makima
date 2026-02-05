import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react"
import { invoke } from "@tauri-apps/api/core"

import type {
  ChatItem,
  Conversation,
  ConversationState,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types"
import type { ChatMessage } from "@/lib/provider-types"
import { useChatProvider } from "@/hooks/use-chat-provider"
import { buildMessageId } from "@/components/main/jarvis-data"
import { ConversationComposer } from "@/components/main/conversation-composer"
import { ConversationSidebar } from "@/components/main/conversation-sidebar"
import { ConversationThread } from "@/components/main/conversation-thread"
import { ModelSelector } from "@/components/main/model-selector"

// Store imports
import {
  useChatDomainActions,
  useChatDomainActiveConversation,
  useChatDomainActiveId,
  useChatDomainConversations,
  useChatDomainHasRunningExecution,
  useChatDomainLoading,
  useChatDomainStore,
} from "@/stores/chat-domain-store"
import {
  useChatActions,
  useComposerValue,
  useSelectedModel,
  useSelectedProvider,
  useTone,
} from "@/stores/chat-store"
import {
  useAuthStatus,
  useOllamaConnected,
  useOllamaModels,
} from "@/stores/provider-store"

// ============================================================================
// Types for database communication
// ============================================================================

interface DbConversationSummary {
  id: string
  title: string
  summary: string
  status: string
  state: string
  created_at: number
  updated_at: number
  repository_id: string | null
}

interface DbMessageMeta {
  provider: string
  model: string
  tone: string
}

interface DbMessage {
  id: string
  conversation_id: string
  role: string
  state: string
  content: string
  created_at: number
  meta: DbMessageMeta
  sort_order: number
}

interface DbConversation {
  id: string
  title: string
  summary: string
  status: string
  state: string
  created_at: number
  updated_at: number
  repository_id: string | null
  messages: Array<DbMessage>
}

function dbMessageToChatItem(msg: DbMessage): ChatItem {
  return {
    id: msg.id,
    kind: "message",
    message: {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      state: msg.state as MessageState,
      content: msg.content,
      createdAt: msg.created_at,
      meta: {
        provider: msg.meta.provider,
        model: msg.meta.model,
        tone: msg.meta.tone,
      },
    },
  }
}

function dbConversationToConversation(dbConv: DbConversation): Conversation {
  return {
    id: dbConv.id,
    title: dbConv.title,
    summary: dbConv.summary,
    status: dbConv.status as ConversationStatus,
    state: dbConv.state as ConversationState,
    createdAt: dbConv.created_at,
    updatedAt: dbConv.updated_at,
    repositoryId: dbConv.repository_id ?? undefined,
    items: dbConv.messages.map(dbMessageToChatItem),
  }
}

function dbSummaryToConversation(summary: DbConversationSummary): Conversation {
  return {
    id: summary.id,
    title: summary.title,
    summary: summary.summary,
    status: summary.status as ConversationStatus,
    state: summary.state as ConversationState,
    createdAt: summary.created_at,
    updatedAt: summary.updated_at,
    repositoryId: summary.repository_id ?? undefined,
    items: [],
  }
}

// ============================================================================
// Context
// ============================================================================

interface ChatDomainContextValue {
  loadConversation: (id: string) => Promise<Conversation | null>
  createConversation: (title: string) => Promise<Conversation | null>
  deleteConversation: (id: string) => Promise<boolean>
  addMessage: (conversationId: string, message: MessageInput) => Promise<boolean>
}

interface MessageInput {
  id: string
  role: string
  state: string
  content: string
  createdAt: number
  provider: string
  model: string
  tone: string
}

const ChatDomainContext = createContext<ChatDomainContextValue | null>(null)

function useChatDomainContext() {
  const ctx = useContext(ChatDomainContext)
  if (!ctx)
    throw new Error(
      "useChatDomainContext must be used within ChatDomainProvider",
    )
  return ctx
}

// ============================================================================
// Provider
// ============================================================================

interface ChatDomainProviderProps {
  children: React.ReactNode
}

export function ChatDomainProvider({ children }: ChatDomainProviderProps) {
  const {
    setConversations,
    setIsLoading,
    setError,
    addConversation,
    removeConversation,
    markConversationLoaded,
    isConversationLoaded,
  } = useChatDomainActions()

  // Load conversations on mount (only those without repository_id)
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const summaries = await invoke<Array<DbConversationSummary>>(
          "db_list_conversations",
        )
        // Filter to only include conversations without repository_id
        const chatOnlyConversations = summaries
          .filter((s) => s.repository_id === null)
          .map(dbSummaryToConversation)
        setConversations(chatOnlyConversations)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()
  }, [setConversations, setIsLoading, setError])

  const loadConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      if (isConversationLoaded(id)) {
        return useChatDomainStore
          .getState()
          .conversations.find((c) => c.id === id) ?? null
      }

      try {
        const dbConv = await invoke<DbConversation | null>(
          "db_get_conversation",
          { id },
        )
        if (!dbConv) return null

        const conversation = dbConversationToConversation(dbConv)
        markConversationLoaded(id)

        // Update in store
        const { conversations, setConversations: setConvs } =
          useChatDomainStore.getState()
        const index = conversations.findIndex((c) => c.id === id)
        if (index !== -1) {
          const next = [...conversations]
          next[index] = conversation
          setConvs(next)
        }

        return conversation
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [isConversationLoaded, markConversationLoaded, setError],
  )

  const createConversation = useCallback(
    async (title: string): Promise<Conversation | null> => {
      try {
        // Create without repository_id for Chat domain
        const dbConv = await invoke<DbConversation>("db_create_conversation", {
          title,
          repositoryId: null,
        })
        const conversation = dbConversationToConversation(dbConv)
        markConversationLoaded(conversation.id)
        addConversation(conversation)
        return conversation
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [addConversation, markConversationLoaded, setError],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await invoke<boolean>("db_delete_conversation", { id })
        removeConversation(id)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [removeConversation, setError],
  )

  const addMessage = useCallback(
    async (conversationId: string, message: MessageInput): Promise<boolean> => {
      try {
        await invoke("db_add_message", {
          conversationId,
          id: message.id,
          role: message.role,
          messageState: message.state,
          content: message.content,
          createdAt: message.createdAt,
          provider: message.provider,
          model: message.model,
          tone: message.tone,
        })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [setError],
  )

  const value: ChatDomainContextValue = {
    loadConversation,
    createConversation,
    deleteConversation,
    addMessage,
  }

  return (
    <ChatDomainContext.Provider value={value}>
      {children}
    </ChatDomainContext.Provider>
  )
}

// ============================================================================
// Sidebar
// ============================================================================

export function ChatSidebar() {
  const conversations = useChatDomainConversations()
  const activeConversationId = useChatDomainActiveId()
  const { setActiveConversationId } = useChatDomainActions()
  const { loadConversation, createConversation, deleteConversation } =
    useChatDomainContext()

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id)
      const conv = conversations.find((c) => c.id === id)
      if (conv && conv.items.length === 0) {
        await loadConversation(id)
      }
    },
    [conversations, loadConversation, setActiveConversationId],
  )

  const handleNewConversation = useCallback(async () => {
    const existingEmpty = conversations.find((c) => c.items.length === 0)
    if (existingEmpty) {
      setActiveConversationId(existingEmpty.id)
      return
    }

    const newConv = await createConversation("New conversation")
    if (newConv) {
      setActiveConversationId(newConv.id)
    }
  }, [conversations, createConversation, setActiveConversationId])

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id)
      if (activeConversationId === id && conversations.length > 1) {
        const remaining = conversations.filter((c) => c.id !== id)
        setActiveConversationId(remaining[0]?.id ?? null)
      }
    },
    [
      activeConversationId,
      deleteConversation,
      conversations,
      setActiveConversationId,
    ],
  )

  return (
    <ConversationSidebar
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
    />
  )
}

// ============================================================================
// Workspace
// ============================================================================

export function ChatWorkspace() {
  const streamingStatesRef = useRef<
    Map<string, { messageId: string; accumulatedContent: string; sessionId: string }>
  >(new Map())

  // Domain store state
  const conversations = useChatDomainConversations()
  const activeConversationId = useChatDomainActiveId()
  const activeConversation = useChatDomainActiveConversation()
  const isLoadingConversations = useChatDomainLoading()
  const hasRunningExecution = useChatDomainHasRunningExecution()

  const {
    setActiveConversationId,
    updateConversations,
    updateConversation: updateConversationStore,
  } = useChatDomainActions()

  // Chat store state (shared)
  const composerValue = useComposerValue()
  const provider = useSelectedProvider()
  const model = useSelectedModel()
  const tone = useTone()
  const { clearComposer, setSelectedModel } = useChatActions()

  // Provider store state
  const isOllamaConnected = useOllamaConnected()
  const ollamaModels = useOllamaModels()
  const authStatus = useAuthStatus()

  // Context hooks
  const { createConversation, addMessage } = useChatDomainContext()

  // Streaming hook
  const { startChatStream } = useChatProvider()

  // Auto-select first conversation
  useEffect(() => {
    if (
      !isLoadingConversations &&
      conversations.length > 0 &&
      !activeConversationId
    ) {
      setActiveConversationId(conversations[0].id)
    }
  }, [
    isLoadingConversations,
    conversations,
    activeConversationId,
    setActiveConversationId,
  ])

  // Auto-select first model
  useEffect(() => {
    if (provider === "ollama" && ollamaModels.length > 0 && !model) {
      setSelectedModel(ollamaModels[0].name)
    }
  }, [ollamaModels, model, provider, setSelectedModel])

  const handleNewConversation = useCallback(async () => {
    const existingEmpty = conversations.find((c) => c.items.length === 0)
    if (existingEmpty) {
      setActiveConversationId(existingEmpty.id)
      return
    }

    const newConv = await createConversation("New conversation")
    if (newConv) {
      setActiveConversationId(newConv.id)
    }
  }, [conversations, createConversation, setActiveConversationId])

  const handleSendMessage = useCallback(async () => {
    if (!activeConversation || !composerValue.trim()) return
    if (
      hasRunningExecution ||
      streamingStatesRef.current.has(activeConversation.id)
    )
      return
    if (!model) return

    // Check provider availability
    if (provider === "ollama" && !isOllamaConnected) return
    if (provider === "openai" && !authStatus?.openai.is_configured) return
    if (provider === "anthropic" && !authStatus?.anthropic.is_configured) return

    const now = Date.now()
    const messageId = buildMessageId()
    const assistantId = buildMessageId()
    const sessionId = `session-${now}`
    const userContent = composerValue.trim()
    const conversationId = activeConversation.id

    streamingStatesRef.current.set(conversationId, {
      messageId: assistantId,
      accumulatedContent: "",
      sessionId,
    })

    const userMessage: ChatItem = {
      id: messageId,
      kind: "message",
      message: {
        id: messageId,
        role: "user",
        state: "normal",
        content: userContent,
        createdAt: now,
        meta: { provider, model, tone },
      },
    }

    const assistantMessage: ChatItem = {
      id: assistantId,
      kind: "message",
      message: {
        id: assistantId,
        role: "assistant",
        state: "thinking",
        content: "",
        createdAt: now + 1,
        meta: { provider, model, tone },
        streamedChars: 0,
      },
    }

    const nextTitle =
      activeConversation.title === "New conversation" ||
      activeConversation.items.length === 0
        ? userContent.slice(0, 32)
        : activeConversation.title

    updateConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation
        return {
          ...conversation,
          title: nextTitle,
          summary: userContent.slice(0, 60) || conversation.summary,
          status: "running" as ConversationStatus,
          updatedAt: now,
          items: [...conversation.items, userMessage, assistantMessage],
        }
      }),
    )

    clearComposer()

    await addMessage(conversationId, {
      id: messageId,
      role: "user",
      state: "normal",
      content: userContent,
      createdAt: now,
      provider,
      model,
      tone,
    })

    if (nextTitle !== activeConversation.title) {
      invoke("db_update_conversation", {
        id: conversationId,
        title: nextTitle,
        summary: userContent.slice(0, 60),
        status: null,
        conversationState: null,
      })
    }

    const conversationHistory: Array<ChatMessage> = activeConversation.items
      .filter((item) => item.kind === "message")
      .map((item) => ({
        role: item.message.role as "user" | "assistant" | "system",
        content: item.message.content,
      }))

    conversationHistory.push({ role: "user", content: userContent })

    startChatStream({
      sessionId,
      provider,
      model,
      messages: conversationHistory,
      temperature: 0.7,
      maxTokens: 4096,
      onChunk: (content, done) => {
        const state = streamingStatesRef.current.get(conversationId)
        if (!state) return

        state.accumulatedContent += content
        const currentContent = state.accumulatedContent
        const currentMessageId = state.messageId

        updateConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item
              return {
                ...item,
                message: {
                  ...item.message,
                  content: currentContent,
                  state: (done ? "normal" : "streaming") as MessageState,
                  streamedChars: currentContent.length,
                },
              }
            })

            return {
              ...conversation,
              status: (done ? "idle" : "running") as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            }
          }),
        )

        if (done) {
          addMessage(conversationId, {
            id: currentMessageId,
            role: "assistant",
            state: "normal",
            content: currentContent,
            createdAt: Date.now(),
            provider,
            model,
            tone,
          })

          streamingStatesRef.current.delete(conversationId)
        }
      },
      onError: (error) => {
        const state = streamingStatesRef.current.get(conversationId)
        if (!state) return

        const currentMessageId = state.messageId
        const errorContent = error || "An error occurred"

        updateConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item
              return {
                ...item,
                message: {
                  ...item.message,
                  content: errorContent,
                  state: "error" as MessageState,
                },
              }
            })

            return {
              ...conversation,
              status: "error" as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            }
          }),
        )

        addMessage(conversationId, {
          id: currentMessageId,
          role: "assistant",
          state: "error",
          content: errorContent,
          createdAt: Date.now(),
          provider,
          model,
          tone,
        })

        streamingStatesRef.current.delete(conversationId)
      },
    })
  }, [
    activeConversation,
    composerValue,
    hasRunningExecution,
    isOllamaConnected,
    model,
    provider,
    authStatus,
    tone,
    startChatStream,
    addMessage,
    updateConversations,
    clearComposer,
  ])

  return (
    <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ConversationThread
          activeConversation={activeConversation}
          onViewRun={() => {}}
        />
        <ConversationComposer
          onSendMessage={handleSendMessage}
          onNewConversation={handleNewConversation}
          modelSelector={<ModelSelector />}
        />
      </div>
    </section>
  )
}

// ============================================================================
// Legacy exports for backwards compatibility
// ============================================================================

export { ChatDomainProvider as ChatTabProvider }
export { ChatSidebar as ChatTabSidebar }
export { ChatWorkspace as ChatTabWorkspace }
