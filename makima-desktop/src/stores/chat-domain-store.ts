import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type {
  ChatItem,
  Conversation,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types";
import { createTauriStorage } from "@/lib/tauri-storage";

// ============================================================================
// Chat Domain Store - Isolated conversations for simple chat (no repository)
// ============================================================================

interface StreamingState {
  messageId: string;
  accumulatedContent: string;
  sessionId: string;
}

interface ChatDomainState {
  // Conversations (filtered: repository_id IS NULL)
  conversations: Array<Conversation>;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  // Loaded tracking
  loadedConversationIds: Set<string>;

  // Streaming state per conversation
  streamingStates: Map<string, StreamingState>;

  // Hydration state
  _hasHydrated: boolean;
}

interface ChatDomainActions {
  // CRUD
  setConversations: (conversations: Array<Conversation>) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (
    id: string,
    updates: Partial<Omit<Conversation, "id">>,
  ) => void;
  removeConversation: (id: string) => void;
  updateConversations: (
    updater: (prev: Array<Conversation>) => Array<Conversation>,
  ) => void;

  // Selection
  setActiveConversationId: (id: string | null) => void;

  // Loading state
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Loaded tracking
  markConversationLoaded: (id: string) => void;
  isConversationLoaded: (id: string) => boolean;

  // Streaming
  setStreamingState: (conversationId: string, state: StreamingState) => void;
  clearStreamingState: (conversationId: string) => void;
  hasStreamingState: (conversationId: string) => boolean;

  // Message updates
  updateMessageContent: (
    conversationId: string,
    messageId: string,
    content: string,
    state: MessageState,
    streamedChars?: number,
  ) => void;

  // Add items
  addItemsToConversation: (
    conversationId: string,
    items: Array<ChatItem>,
  ) => void;

  // Conversation status
  updateConversationStatus: (id: string, status: ConversationStatus) => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export type ChatDomainStore = ChatDomainState & ChatDomainActions;

const initialState: Omit<ChatDomainState, "_hasHydrated"> = {
  conversations: [],
  activeConversationId: null,
  isLoading: true,
  error: null,
  loadedConversationIds: new Set(),
  streamingStates: new Map(),
};

const tauriChatDomainStorage = createTauriStorage("chat-domain.json");

export const useChatDomainStore = create<ChatDomainStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      _hasHydrated: false,

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
      const newMap = new Map(state.streamingStates);
      newMap.set(conversationId, streamingState);
      return { streamingStates: newMap };
    }),

  clearStreamingState: (conversationId) =>
    set((state) => {
      const newMap = new Map(state.streamingStates);
      newMap.delete(conversationId);
      return { streamingStates: newMap };
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
                state: messageState,
                ...(streamedChars !== undefined && { streamedChars }),
              },
            };
          }),
        };
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

  // Hydration
  setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "makima-chat-domain",
      storage: createJSONStorage(() => tauriChatDomainStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
);

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// Hydration selector
export const useChatDomainHydrated = () =>
  useChatDomainStore((s) => s._hasHydrated);

// List selectors
export const useChatDomainConversations = () =>
  useChatDomainStore((s) => s.conversations);

export const useChatDomainConversationsCount = () =>
  useChatDomainStore((s) => s.conversations.length);

export const useChatDomainVisibleConversations = () =>
  useChatDomainStore(
    useShallow((s) => s.conversations.filter((c) => c.items.length > 0)),
  );

// Active conversation selectors
export const useChatDomainActiveId = () =>
  useChatDomainStore((s) => s.activeConversationId);

export const useChatDomainActiveConversation = () =>
  useChatDomainStore((s) =>
    s.conversations.find((c) => c.id === s.activeConversationId),
  );

// Loading selectors
export const useChatDomainLoading = () =>
  useChatDomainStore((s) => s.isLoading);

export const useChatDomainError = () => useChatDomainStore((s) => s.error);

// Derived state selectors
export const useChatDomainHasRunningExecution = () =>
  useChatDomainStore((s) => {
    const active = s.conversations.find((c) => c.id === s.activeConversationId);
    return Boolean(
      active?.items.some(
        (item) => item.kind === "execution" && item.run.status === "running",
      ),
    );
  });

export const useChatDomainIsThinkingOrStreaming = () =>
  useChatDomainStore((s) => {
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

// Actions selector (stable reference with useShallow)
export const useChatDomainActions = () =>
  useChatDomainStore(
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
  );
