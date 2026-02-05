import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ChatItem,
  Conversation,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types";
import type { ChatMessage, Provider } from "@/lib/provider-types";
import { useChatProvider } from "@/hooks/use-chat-provider";
import { useConversations } from "@/hooks/use-conversations";
import { useSettingsStore } from "@/stores/settings-store";
import { buildMessageId } from "@/components/main/jarvis-data";
import { ConversationComposer } from "@/components/main/conversation-composer";
import { ConversationSidebar } from "@/components/main/conversation-sidebar";
import { ConversationThread } from "@/components/main/conversation-thread";
import { ModelSelector } from "@/components/main/model-selector";


interface StreamingState {
  messageId: string;
  accumulatedContent: string;
  sessionId: string;
}

interface ChatTabContextValue {
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  streamingConversationIds: Set<string>;
  setStreamingConversationIds: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
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
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [streamingConversationIds, setStreamingConversationIds] = useState<
    Set<string>
  >(new Set());

  const value: ChatTabContextValue = {
    activeConversationId,
    setActiveConversationId,
    streamingConversationIds,
    setStreamingConversationIds,
  };

  return (
    <ChatTabContext.Provider value={value}>{children}</ChatTabContext.Provider>
  );
}

export function ChatTabSidebar() {
  const ctx = useChatTabContext();
  const {
    conversations,
    loadConversation,
    createConversation,
    deleteConversation: deleteConversationDb,
    setConversations,
  } = useConversations();

  const handleSelectConversation = useCallback(
    async (id: string) => {
      ctx.setActiveConversationId(id);
      const conv = conversations.find((c) => c.id === id);
      if (conv && conv.items.length === 0) {
        await loadConversation(id);
      }
    },
    [ctx, conversations, loadConversation],
  );

  const handleNewConversation = useCallback(async () => {
    const existingEmpty = conversations.find((c) => c.items.length === 0);
    if (existingEmpty) {
      ctx.setActiveConversationId(existingEmpty.id);
      return;
    }

    const newConv = await createConversation("New conversation");
    if (newConv) {
      ctx.setActiveConversationId(newConv.id);
    }
  }, [ctx, conversations, createConversation]);

  const handleRenameConversation = useCallback((_id: string) => {
    // TODO: implement rename
  }, []);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversationDb(id);
      if (ctx.activeConversationId === id && conversations.length > 1) {
        const remaining = conversations.filter((c) => c.id !== id);
        ctx.setActiveConversationId(remaining[0]?.id ?? "");
      }
    },
    [ctx, deleteConversationDb, conversations],
  );

  const handleDuplicateConversation = useCallback(
    (id: string) => {
      const original = conversations.find((c) => c.id === id);
      if (original) {
        const duplicate: Conversation = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} (cópia)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations((prev) => [duplicate, ...prev]);
      }
    },
    [conversations, setConversations],
  );

  const handleExportConversation = useCallback(
    (id: string) => {
      const conversation = conversations.find((c) => c.id === id);
      if (conversation) {
        const data = JSON.stringify(conversation, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${conversation.title.replace(/[^a-z0-9]/gi, "_")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [conversations],
  );

  const handleArchiveConversation = useCallback((_id: string) => {
    // TODO: Implementar lógica de arquivamento
  }, []);

  return (
    <ConversationSidebar
      conversations={conversations}
      activeConversationId={ctx.activeConversationId}
      streamingConversationIds={ctx.streamingConversationIds}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onRenameConversation={handleRenameConversation}
      onDeleteConversation={handleDeleteConversation}
      onDuplicateConversation={handleDuplicateConversation}
      onExportConversation={handleExportConversation}
      onArchiveConversation={handleArchiveConversation}
    />
  );
}

export function ChatTabWorkspace() {
  const ctx = useChatTabContext();

  const {
    startChatStream,
    auth,
    ollama: {
      connectionState,
      models: ollamaModels,
      isLoadingModels,
      pullingModel,
      pullProgress,
      pullModel,
      deleteModel,
      fetchModels,
    },
  } = useChatProvider();

  const {
    conversations,
    isLoading: isLoadingConversations,
    updateConversation,
    addMessage,
    setConversations,
    createConversation,
  } = useConversations();

  const { providers } = useSettingsStore();

  const [tone] = useState("balanced");
  const [provider, setProvider] = useState<Provider>("ollama");
  const [model, setModel] = useState("");

  const [composerValue, setComposerValue] = useState("");
  const [composerRows, setComposerRows] = useState(1);

  const streamingStatesRef = useRef<Map<string, StreamingState>>(new Map());

  // Auto-select first conversation
  useEffect(() => {
    if (
      !isLoadingConversations &&
      conversations.length > 0 &&
      !ctx.activeConversationId
    ) {
      ctx.setActiveConversationId(conversations[0].id);
    }
  }, [isLoadingConversations, conversations, ctx]);

  // Auto-select first model
  useEffect(() => {
    if (provider === "ollama" && ollamaModels.length > 0 && !model) {
      setModel(ollamaModels[0].name);
    }
  }, [ollamaModels, model, provider]);

  const handleSelectModel = useCallback(
    (newModel: string, newProvider: Provider) => {
      setModel(newModel);
      setProvider(newProvider);
    },
    [],
  );

  // Update composer rows
  useEffect(() => {
    const lines = composerValue.split("\n").length;
    setComposerRows(Math.min(6, Math.max(1, lines)));
  }, [composerValue]);

  // Streaming animation interval
  useEffect(() => {
    const interval = setInterval(() => {
      setConversations((prev) => {
        let didUpdate = false;
        const next = prev.map((conversation) => {
          let itemsChanged = false;
          let hasStreaming = false;
          let hasThinking = false;
          const nextItems = conversation.items.map((item) => {
            if (item.kind !== "message") return item;
            if (item.message.state === "streaming") {
              const current = item.message.streamedChars ?? 0;
              if (current >= item.message.content.length) return item;
              const step = Math.floor(Math.random() * 4) + 2;
              const nextCount = Math.min(
                item.message.content.length,
                current + step,
              );
              const done = nextCount >= item.message.content.length;
              itemsChanged = true;
              didUpdate = true;
              hasStreaming = !done;
              return {
                ...item,
                message: {
                  ...item.message,
                  streamedChars: nextCount,
                  state: (done ? "normal" : "streaming") as MessageState,
                },
              };
            }
            if (item.message.state === "thinking") {
              hasThinking = true;
            }
            return item;
          });

          if (!itemsChanged) return conversation;

          const hasRunningExecution = nextItems.some(
            (item) =>
              item.kind === "execution" && item.run.status === "running",
          );

          const nextStatus: ConversationStatus =
            conversation.state === "error"
              ? "error"
              : hasRunningExecution || hasStreaming || hasThinking
                ? "running"
                : "idle";

          return {
            ...conversation,
            items: nextItems,
            status: nextStatus,
          };
        });

        return didUpdate ? next : prev;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [setConversations]);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === ctx.activeConversationId,
      ),
    [conversations, ctx.activeConversationId],
  );

  const hasRunningExecution = Boolean(
    activeConversation?.items.some(
      (item) => item.kind === "execution" && item.run.status === "running",
    ),
  );

  const isThinking = Boolean(
    activeConversation?.items.some(
      (item) => item.kind === "message" && item.message.state === "thinking",
    ),
  );

  const isStreaming = Boolean(
    activeConversation?.items.some(
      (item) => item.kind === "message" && item.message.state === "streaming",
    ),
  );

  const inputState = hasRunningExecution
    ? "executing"
    : isThinking || isStreaming
      ? "thinking"
      : "idle";

  const handleNewConversation = useCallback(async () => {
    const existingEmpty = conversations.find((c) => c.items.length === 0);
    if (existingEmpty) {
      ctx.setActiveConversationId(existingEmpty.id);
      return;
    }

    const newConv = await createConversation("New conversation");
    if (newConv) {
      ctx.setActiveConversationId(newConv.id);
    }
  }, [ctx, conversations, createConversation]);

  const handleSendMessage = useCallback(async () => {
    if (!activeConversation || !composerValue.trim()) return;
    if (
      hasRunningExecution ||
      streamingStatesRef.current.has(activeConversation.id)
    )
      return;
    if (!model) return;

    // Check provider availability
    if (provider === "ollama" && !connectionState.isConnected) return;
    if (provider === "openai" && !auth.status?.openai.is_configured) return;
    if (provider === "anthropic" && !auth.status?.anthropic.is_configured)
      return;

    const now = Date.now();
    const messageId = buildMessageId();
    const assistantId = buildMessageId();
    const sessionId = `session-${now}`;
    const userContent = composerValue.trim();
    const conversationId = activeConversation.id;

    streamingStatesRef.current.set(conversationId, {
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

    setConversations((prev) =>
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

    setComposerValue("");

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
        const state = streamingStatesRef.current.get(conversationId);
        if (!state) return;

        state.accumulatedContent += content;
        const currentContent = state.accumulatedContent;
        const currentMessageId = state.messageId;

        setConversations((prev) =>
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

          streamingStatesRef.current.delete(conversationId);
        }
      },
      onError: (error) => {
        const state = streamingStatesRef.current.get(conversationId);
        if (!state) return;

        const currentMessageId = state.messageId;
        const errorContent = error || "An error occurred";

        setConversations((prev) =>
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

        streamingStatesRef.current.delete(conversationId);
      },
    });
  }, [
    activeConversation,
    composerValue,
    hasRunningExecution,
    connectionState.isConnected,
    model,
    provider,
    auth.status,
    tone,
    startChatStream,
    addMessage,
    updateConversation,
    setConversations,
  ]);

  return (
    <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ConversationThread
          activeConversation={activeConversation}
          onViewRun={() => {}}
        />
        <ConversationComposer
          composerValue={composerValue}
          composerRows={composerRows}
          hasRunningExecution={hasRunningExecution}
          inputState={inputState}
          onComposerChange={setComposerValue}
          onSendMessage={handleSendMessage}
          onNewConversation={handleNewConversation}
          isModelSelected={Boolean(model)}
          modelSelector={
            <ModelSelector
              ollamaModels={ollamaModels}
              selectedModel={model}
              selectedProvider={provider}
              onSelectModel={handleSelectModel}
              isOllamaConnected={connectionState.isConnected}
              isLoadingModels={isLoadingModels}
              pullingModel={pullingModel}
              pullProgress={pullProgress}
              onPullModel={pullModel}
              onDeleteModel={deleteModel}
              onRefresh={fetchModels}
              authStatus={auth.status}
              openaiAuthPreference={providers.openai.preferredAuthSource}
              anthropicAuthPreference={providers.anthropic.preferredAuthSource}
            />
          }
        />
      </div>
    </section>
  );
}
