import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  ChatItem,
  Conversation,
  ConversationState,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types";

// ============================================================================
// Conversation Store - CRUD and streaming state for conversations
// ============================================================================

interface StreamingMessage {
  content: string;
  sessionId: string;
}

interface ConversationStoreState {
  // Conversations
  conversations: Array<Conversation>;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  // Streaming state per conversation
  streamingMessages: Map<string, StreamingMessage>;

  // Track which conversations have been fully loaded
  loadedConversationIds: Set<string>;

  // Streaming conversation IDs (for UI indicators)
  streamingConversationIds: Set<string>;
}

interface ConversationStoreActions {
  // CRUD
  setConversations: (conversations: Array<Conversation>) => void;
  updateConversations: (
    updater: (prev: Array<Conversation>) => Array<Conversation>,
  ) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (
    id: string,
    updates: Partial<Omit<Conversation, "id">>,
  ) => void;
  removeConversation: (id: string) => void;

  // Selection
  setActiveConversationId: (id: string | null) => void;

  // Loading state
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Loaded tracking
  markConversationLoaded: (id: string) => void;
  isConversationLoaded: (id: string) => boolean;

  // Streaming
  setStreamingMessage: (
    conversationId: string,
    message: StreamingMessage,
  ) => void;
  clearStreamingMessage: (conversationId: string) => void;
  addStreamingConversationId: (id: string) => void;
  removeStreamingConversationId: (id: string) => void;

  // Message updates (for streaming animation)
  updateMessageContent: (
    conversationId: string,
    messageId: string,
    content: string,
    state: MessageState,
    streamedChars?: number,
  ) => void;
  updateMessageState: (
    conversationId: string,
    messageId: string,
    state: MessageState,
  ) => void;

  // Conversation status
  updateConversationStatus: (id: string, status: ConversationStatus) => void;

  // Add items to conversation
  addItemToConversation: (conversationId: string, item: ChatItem) => void;
  addItemsToConversation: (
    conversationId: string,
    items: Array<ChatItem>,
  ) => void;
}

export type ConversationStore = ConversationStoreState &
  ConversationStoreActions;

const initialState: ConversationStoreState = {
  conversations: [],
  activeConversationId: null,
  isLoading: true,
  error: null,
  streamingMessages: new Map(),
  loadedConversationIds: new Set(),
  streamingConversationIds: new Set(),
};

export const useConversationStore = create<ConversationStore>((set, get) => ({
  ...initialState,

  // CRUD
  setConversations: (conversations) => set({ conversations }),

  updateConversations: (updater) =>
    set((state) => ({ conversations: updater(state.conversations) })),

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
    })),

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
  setStreamingMessage: (conversationId, message) =>
    set((state) => {
      const newMap = new Map(state.streamingMessages);
      newMap.set(conversationId, message);
      return { streamingMessages: newMap };
    }),

  clearStreamingMessage: (conversationId) =>
    set((state) => {
      const newMap = new Map(state.streamingMessages);
      newMap.delete(conversationId);
      return { streamingMessages: newMap };
    }),

  addStreamingConversationId: (id) =>
    set((state) => ({
      streamingConversationIds: new Set([
        ...state.streamingConversationIds,
        id,
      ]),
    })),

  removeStreamingConversationId: (id) =>
    set((state) => ({
      streamingConversationIds: new Set(
        [...state.streamingConversationIds].filter((cid) => cid !== id),
      ),
    })),

  // Message updates
  updateMessageContent: (
    conversationId,
    messageId,
    content,
    state,
    streamedChars,
  ) =>
    set((prev) => ({
      conversations: prev.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          updatedAt: Date.now(),
          items: conv.items.map((item) => {
            if (item.id !== messageId || item.kind !== "message") return item;
            return {
              ...item,
              message: {
                ...item.message,
                content,
                state,
                ...(streamedChars !== undefined && { streamedChars }),
              },
            };
          }),
        };
      }),
    })),

  updateMessageState: (conversationId, messageId, state) =>
    set((prev) => ({
      conversations: prev.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          items: conv.items.map((item) => {
            if (item.id !== messageId || item.kind !== "message") return item;
            return {
              ...item,
              message: { ...item.message, state },
            };
          }),
        };
      }),
    })),

  // Conversation status
  updateConversationStatus: (id, status) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, status, updatedAt: Date.now() } : c,
      ),
    })),

  // Add items
  addItemToConversation: (conversationId, item) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, items: [...c.items, item], updatedAt: Date.now() }
          : c,
      ),
    })),

  addItemsToConversation: (conversationId, items) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, items: [...c.items, ...items], updatedAt: Date.now() }
          : c,
      ),
    })),
}));

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// List selectors
export const useConversationsList = () =>
  useConversationStore((s) => s.conversations);

export const useConversationsCount = () =>
  useConversationStore((s) => s.conversations.length);

export const useVisibleConversations = () =>
  useConversationStore(
    useShallow((s) => s.conversations.filter((c) => c.items.length > 0)),
  );

// Active conversation selectors
export const useActiveConversationId = () =>
  useConversationStore((s) => s.activeConversationId);

export const useActiveConversation = () =>
  useConversationStore((s) =>
    s.conversations.find((c) => c.id === s.activeConversationId),
  );

export const useConversationById = (id: string | null) =>
  useConversationStore((s) =>
    id ? s.conversations.find((c) => c.id === id) : undefined,
  );

// Loading selectors
export const useConversationsLoading = () =>
  useConversationStore((s) => s.isLoading);

export const useConversationsError = () => useConversationStore((s) => s.error);

// Streaming selectors
// Convert Set to Array for stable SSR hydration
export const useStreamingConversationIds = () =>
  useConversationStore(useShallow((s) => [...s.streamingConversationIds]));

export const useIsConversationStreaming = (id: string) =>
  useConversationStore((s) => s.streamingConversationIds.has(id));

// Derived state selectors for active conversation
export const useHasRunningExecution = () =>
  useConversationStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId);
    return Boolean(
      active?.items.some(
        (item) => item.kind === "execution" && item.run.status === "running",
      ),
    );
  });

export const useIsThinking = () =>
  useConversationStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId);
    return Boolean(
      active?.items.some(
        (item) => item.kind === "message" && item.message.state === "thinking",
      ),
    );
  });

export const useIsStreaming = () =>
  useConversationStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId);
    return Boolean(
      active?.items.some(
        (item) => item.kind === "message" && item.message.state === "streaming",
      ),
    );
  });

export const useIsThinkingOrStreaming = () =>
  useConversationStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId);
    return Boolean(
      active?.items.some(
        (item) =>
          item.kind === "message" &&
          (item.message.state === "thinking" ||
            item.message.state === "streaming"),
      ),
    );
  });

export const useInputState = () =>
  useConversationStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId);
    if (!active) return "idle";

    const hasRunning = active.items.some(
      (item) => item.kind === "execution" && item.run.status === "running",
    );
    if (hasRunning) return "executing";

    const hasThinkingOrStreaming = active.items.some(
      (item) =>
        item.kind === "message" &&
        (item.message.state === "thinking" ||
          item.message.state === "streaming"),
    );
    if (hasThinkingOrStreaming) return "thinking";

    return "idle";
  });

// Actions selector (stable reference)
export const useConversationActions = () =>
  useConversationStore(
    useShallow((s) => ({
      setConversations: s.setConversations,
      updateConversations: s.updateConversations,
      addConversation: s.addConversation,
      updateConversation: s.updateConversation,
      removeConversation: s.removeConversation,
      setActiveConversationId: s.setActiveConversationId,
      setIsLoading: s.setIsLoading,
      setError: s.setError,
      markConversationLoaded: s.markConversationLoaded,
      isConversationLoaded: s.isConversationLoaded,
      setStreamingMessage: s.setStreamingMessage,
      clearStreamingMessage: s.clearStreamingMessage,
      addStreamingConversationId: s.addStreamingConversationId,
      removeStreamingConversationId: s.removeStreamingConversationId,
      updateMessageContent: s.updateMessageContent,
      updateMessageState: s.updateMessageState,
      updateConversationStatus: s.updateConversationStatus,
      addItemToConversation: s.addItemToConversation,
      addItemsToConversation: s.addItemsToConversation,
    })),
  );
