import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"
import type {
  ChatItem,
  Conversation,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types"

// ============================================================================
// Code Domain Store - Isolated conversations for code tab (with repository)
// ============================================================================

interface StreamingState {
  messageId: string
  accumulatedContent: string
  sessionId: string
}

interface CodeDomainState {
  // Conversations (filtered: repository_id IS NOT NULL)
  conversations: Array<Conversation>
  activeConversationId: string | null
  isLoading: boolean
  error: string | null

  // Loaded tracking
  loadedConversationIds: Set<string>

  // Streaming state per conversation
  streamingStates: Map<string, StreamingState>
}

interface CodeDomainActions {
  // CRUD
  setConversations: (conversations: Array<Conversation>) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (
    id: string,
    updates: Partial<Omit<Conversation, "id">>,
  ) => void
  removeConversation: (id: string) => void
  updateConversations: (
    updater: (prev: Array<Conversation>) => Array<Conversation>,
  ) => void

  // Selection
  setActiveConversationId: (id: string | null) => void

  // Loading state
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Loaded tracking
  markConversationLoaded: (id: string) => void
  isConversationLoaded: (id: string) => boolean

  // Streaming
  setStreamingState: (conversationId: string, state: StreamingState) => void
  clearStreamingState: (conversationId: string) => void
  hasStreamingState: (conversationId: string) => boolean

  // Message updates
  updateMessageContent: (
    conversationId: string,
    messageId: string,
    content: string,
    state: MessageState,
    streamedChars?: number,
  ) => void

  // Add items
  addItemsToConversation: (
    conversationId: string,
    items: Array<ChatItem>,
  ) => void

  // Conversation status
  updateConversationStatus: (id: string, status: ConversationStatus) => void
}

export type CodeDomainStore = CodeDomainState & CodeDomainActions

const initialState: CodeDomainState = {
  conversations: [],
  activeConversationId: null,
  isLoading: true,
  error: null,
  loadedConversationIds: new Set(),
  streamingStates: new Map(),
}

export const useCodeDomainStore = create<CodeDomainStore>((set, get) => ({
  ...initialState,

  // CRUD
  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      loadedConversationIds: new Set(
        [...state.loadedConversationIds].filter((cid) => cid !== id),
      ),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
    })),

  updateConversations: (updater) =>
    set((state) => ({ conversations: updater(state.conversations) })),

  // Selection
  setActiveConversationId: (activeConversationId) =>
    set({ activeConversationId }),

  // Loading state
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Loaded tracking
  markConversationLoaded: (id) =>
    set((state) => ({
      loadedConversationIds: new Set([...state.loadedConversationIds, id]),
    })),

  isConversationLoaded: (id) => get().loadedConversationIds.has(id),

  // Streaming
  setStreamingState: (conversationId, streamingState) =>
    set((state) => {
      const newMap = new Map(state.streamingStates)
      newMap.set(conversationId, streamingState)
      return { streamingStates: newMap }
    }),

  clearStreamingState: (conversationId) =>
    set((state) => {
      const newMap = new Map(state.streamingStates)
      newMap.delete(conversationId)
      return { streamingStates: newMap }
    }),

  hasStreamingState: (conversationId) =>
    get().streamingStates.has(conversationId),

  // Message updates
  updateMessageContent: (
    conversationId,
    messageId,
    content,
    messageState,
    streamedChars,
  ) =>
    set((prev) => ({
      conversations: prev.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv
        return {
          ...conv,
          updatedAt: Date.now(),
          items: conv.items.map((item) => {
            if (item.id !== messageId || item.kind !== "message") return item
            return {
              ...item,
              message: {
                ...item.message,
                content,
                state: messageState,
                ...(streamedChars !== undefined && { streamedChars }),
              },
            }
          }),
        }
      }),
    })),

  // Add items
  addItemsToConversation: (conversationId, items) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, items: [...c.items, ...items], updatedAt: Date.now() }
          : c,
      ),
    })),

  // Conversation status
  updateConversationStatus: (id, status) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, status, updatedAt: Date.now() } : c,
      ),
    })),
}))

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// List selectors
export const useCodeDomainConversations = () =>
  useCodeDomainStore((s) => s.conversations)

export const useCodeDomainConversationsCount = () =>
  useCodeDomainStore((s) => s.conversations.length)

// Active conversation selectors
export const useCodeDomainActiveId = () =>
  useCodeDomainStore((s) => s.activeConversationId)

export const useCodeDomainActiveConversation = () =>
  useCodeDomainStore((s) =>
    s.conversations.find((c) => c.id === s.activeConversationId),
  )

// Loading selectors
export const useCodeDomainLoading = () =>
  useCodeDomainStore((s) => s.isLoading)

export const useCodeDomainError = () => useCodeDomainStore((s) => s.error)

// Derived state selectors
export const useCodeDomainHasRunningExecution = () =>
  useCodeDomainStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId)
    return Boolean(
      active?.items.some(
        (item) => item.kind === "execution" && item.run.status === "running",
      ),
    )
  })

export const useCodeDomainIsThinkingOrStreaming = () =>
  useCodeDomainStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId)
    return Boolean(
      active?.items.some(
        (item) =>
          item.kind === "message" &&
          (item.message.state === "thinking" ||
            item.message.state === "streaming"),
      ),
    )
  })

// Actions selector (stable reference with useShallow)
export const useCodeDomainActions = () =>
  useCodeDomainStore(
    useShallow((s) => ({
      setConversations: s.setConversations,
      addConversation: s.addConversation,
      updateConversation: s.updateConversation,
      removeConversation: s.removeConversation,
      updateConversations: s.updateConversations,
      setActiveConversationId: s.setActiveConversationId,
      setIsLoading: s.setIsLoading,
      setError: s.setError,
      markConversationLoaded: s.markConversationLoaded,
      isConversationLoaded: s.isConversationLoaded,
      setStreamingState: s.setStreamingState,
      clearStreamingState: s.clearStreamingState,
      hasStreamingState: s.hasStreamingState,
      updateMessageContent: s.updateMessageContent,
      addItemsToConversation: s.addItemsToConversation,
      updateConversationStatus: s.updateConversationStatus,
    })),
  )
