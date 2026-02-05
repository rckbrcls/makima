import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import type {
  ChatItem,
  Conversation,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types";
import type { ChatMessage } from "@/lib/provider-types";
import { useChatProvider } from "@/hooks/use-chat-provider";
import { useConversations } from "@/hooks/use-conversations";
import { buildMessageId } from "@/components/main/jarvis-data";
import { ConversationComposer } from "@/components/main/conversation-composer";
import { ConversationSidebar } from "@/components/main/conversation-sidebar";
import { ConversationThread } from "@/components/main/conversation-thread";
import { ModelSelector } from "@/components/main/model-selector";
// Store imports
import {
  useActiveConversation,
  useActiveConversationId,
  useConversationActions,
  useConversationsList,
  useConversationsLoading,
  useHasRunningExecution,
} from "@/stores/conversation-store";
import {
  useChatActions,
  useComposerValue,
  useSelectedModel,
  useSelectedProvider,
  useTone,
} from "@/stores/chat-store";
import {
  useAuthStatus,
  useOllamaConnected,
  useOllamaModels,
} from "@/stores/provider-store";

interface StreamingState {
  messageId: string;
  accumulatedContent: string;
  sessionId: string;
}

interface ChatTabContextValue {
  streamingStatesRef: React.MutableRefObject<Map<string, StreamingState>>;
}

const ChatTabContext = createContext<ChatTabContextValue | null>(null);

function useChatTabContext() {
  const ctx = useContext(ChatTabContext);
  if (!ctx)
    throw new Error("useChatTabContext must be used within ChatTabProvider");
  return ctx;
}

interface ChatTabProviderProps {
  children: React.ReactNode;
}

export function ChatTabProvider({ children }: ChatTabProviderProps) {
  const streamingStatesRef = useRef<Map<string, StreamingState>>(new Map());

  const value: ChatTabContextValue = {
    streamingStatesRef,
  };

  return (
    <ChatTabContext.Provider value={value}>{children}</ChatTabContext.Provider>
  );
}

export function ChatTabSidebar() {
  const conversations = useConversationsList();
  const activeConversationId = useActiveConversationId();
  const { setActiveConversationId } = useConversationActions();

  const {
    loadConversation,
    createConversation,
    deleteConversation: deleteConversationDb,
  } = useConversations();

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      const conv = conversations.find((c) => c.id === id);
      if (conv && conv.items.length === 0) {
        await loadConversation(id);
      }
    },
    [conversations, loadConversation, setActiveConversationId],
  );

  const handleNewConversation = useCallback(async () => {
    const existingEmpty = conversations.find((c) => c.items.length === 0);
    if (existingEmpty) {
      setActiveConversationId(existingEmpty.id);
      return;
    }

    const newConv = await createConversation("New conversation");
    if (newConv) {
      setActiveConversationId(newConv.id);
    }
  }, [conversations, createConversation, setActiveConversationId]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationDb(id);
      if (activeConversationId === id && conversations.length > 1) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConversationId(remaining[0]?.id ?? null);
      }
    },
    [
      activeConversationId,
      deleteConversationDb,
      conversations,
      setActiveConversationId,
    ],
  );

  return (
    <ConversationSidebar
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
    />
  );
}

export function ChatTabWorkspace() {
  const ctx = useChatTabContext();

  // Store state
  const conversations = useConversationsList();
  const activeConversationId = useActiveConversationId();
  const activeConversation = useActiveConversation();
  const isLoadingConversations = useConversationsLoading();
  const hasRunningExecution = useHasRunningExecution();

  // Chat store state
  const composerValue = useComposerValue();
  const provider = useSelectedProvider();
  const model = useSelectedModel();
  const tone = useTone();
  const { clearComposer, setSelectedModel } = useChatActions();

  // Provider store state
  const isOllamaConnected = useOllamaConnected();
  const ollamaModels = useOllamaModels();
  const authStatus = useAuthStatus();

  // Conversation actions
  const { setActiveConversationId, updateConversations } =
    useConversationActions();

  // Hooks
  const { startChatStream } = useChatProvider();
  const { createConversation, addMessage, updateConversation } =
    useConversations();

  // Auto-select first conversation
  useEffect(() => {
    if (
      !isLoadingConversations &&
      conversations.length > 0 &&
      !activeConversationId
    ) {
      setActiveConversationId(conversations[0].id);
    }
  }, [
    isLoadingConversations,
    conversations,
    activeConversationId,
    setActiveConversationId,
  ]);

  // Auto-select first model
  useEffect(() => {
    if (provider === "ollama" && ollamaModels.length > 0 && !model) {
      setSelectedModel(ollamaModels[0].name);
    }
  }, [ollamaModels, model, provider, setSelectedModel]);

  const handleNewConversation = useCallback(async () => {
    const existingEmpty = conversations.find((c) => c.items.length === 0);
    if (existingEmpty) {
      setActiveConversationId(existingEmpty.id);
      return;
    }

    const newConv = await createConversation("New conversation");
    if (newConv) {
      setActiveConversationId(newConv.id);
    }
  }, [conversations, createConversation, setActiveConversationId]);

  const handleSendMessage = useCallback(async () => {
    if (!activeConversation || !composerValue.trim()) return;
    if (
      hasRunningExecution ||
      ctx.streamingStatesRef.current.has(activeConversation.id)
    )
      return;
    if (!model) return;

    // Check provider availability
    if (provider === "ollama" && !isOllamaConnected) return;
    if (provider === "openai" && !authStatus?.openai.is_configured) return;
    if (provider === "anthropic" && !authStatus?.anthropic.is_configured)
      return;

    const now = Date.now();
    const messageId = buildMessageId();
    const assistantId = buildMessageId();
    const sessionId = `session-${now}`;
    const userContent = composerValue.trim();
    const conversationId = activeConversation.id;

    ctx.streamingStatesRef.current.set(conversationId, {
      messageId: assistantId,
      accumulatedContent: "",
      sessionId,
    });

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
    };

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
    };

    const nextTitle =
      activeConversation.title === "New conversation" ||
      activeConversation.items.length === 0
        ? userContent.slice(0, 32)
        : activeConversation.title;

    updateConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          title: nextTitle,
          summary: userContent.slice(0, 60) || conversation.summary,
          status: "running" as ConversationStatus,
          updatedAt: now,
          items: [...conversation.items, userMessage, assistantMessage],
        };
      }),
    );

    clearComposer();

    await addMessage(conversationId, {
      id: messageId,
      role: "user",
      state: "normal",
      content: userContent,
      createdAt: now,
      provider,
      model,
      tone,
    });

    if (nextTitle !== activeConversation.title) {
      updateConversation(conversationId, {
        title: nextTitle,
        summary: userContent.slice(0, 60),
      });
    }

    const conversationHistory: Array<ChatMessage> = activeConversation.items
      .filter((item) => item.kind === "message")
      .map((item) => ({
        role: item.message.role as "user" | "assistant" | "system",
        content: item.message.content,
      }));

    conversationHistory.push({ role: "user", content: userContent });

    startChatStream({
      sessionId,
      provider,
      model,
      messages: conversationHistory,
      temperature: 0.7,
      maxTokens: 4096,
      onChunk: (content, done) => {
        const state = ctx.streamingStatesRef.current.get(conversationId);
        if (!state) return;

        state.accumulatedContent += content;
        const currentContent = state.accumulatedContent;
        const currentMessageId = state.messageId;

        updateConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item;
              return {
                ...item,
                message: {
                  ...item.message,
                  content: currentContent,
                  state: (done ? "normal" : "streaming") as MessageState,
                  streamedChars: currentContent.length,
                },
              };
            });

            return {
              ...conversation,
              status: (done ? "idle" : "running") as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            };
          }),
        );

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
          });

          ctx.streamingStatesRef.current.delete(conversationId);
        }
      },
      onError: (error) => {
        const state = ctx.streamingStatesRef.current.get(conversationId);
        if (!state) return;

        const currentMessageId = state.messageId;
        const errorContent = error || "An error occurred";

        updateConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item;
              return {
                ...item,
                message: {
                  ...item.message,
                  content: errorContent,
                  state: "error" as MessageState,
                },
              };
            });

            return {
              ...conversation,
              status: "error" as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            };
          }),
        );

        addMessage(conversationId, {
          id: currentMessageId,
          role: "assistant",
          state: "error",
          content: errorContent,
          createdAt: Date.now(),
          provider,
          model,
          tone,
        });

        ctx.streamingStatesRef.current.delete(conversationId);
      },
    });
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
    updateConversation,
    updateConversations,
    clearComposer,
    ctx,
  ]);

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
  );
}
