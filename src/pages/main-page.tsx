import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AutomationKey,
  ChannelKey,
  IntegrationKey,
  MemoryKey,
  NotificationKey,
  PluginKey,
  SafetyKey,
  ToolKey,
} from "@/components/main/config-types";
import {
  automationDefaults,
  channelDefaults,
  integrationDefaults,
  memoryDefaults,
  notificationDefaults,
  pluginDefaults,
  safetyDefaults,
  toolDefaults,
} from "@/components/main/config-types";
import { ConfigPanel } from "@/components/main/config-panel";
import { ConversationComposer } from "@/components/main/conversation-composer";
import { ConversationSidebar } from "@/components/main/conversation-sidebar";
import { ConversationThread } from "@/components/main/conversation-thread";
import { buildMessageId } from "@/components/main/jarvis-data";
import type {
  ChatItem,
  Conversation,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types";
import { ModelSelector } from "@/components/main/model-selector";
import { RunDetailsModal } from "@/components/main/run-details-modal";
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import { useConversations } from "@/hooks/use-conversations";
import { useChatProvider } from "@/hooks/use-chat-provider";
import type { ChatMessage, Provider } from "@/lib/provider-types";

interface StreamingState {
  messageId: string;
  accumulatedContent: string;
  sessionId: string;
}

export function MainPage() {
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
    loadConversation,
    createConversation,
    updateConversation,
    deleteConversation: deleteConversationDb,
    addMessage,
    updateMessage: _updateMessage,
    setConversations,
  } = useConversations();

  const [tone,] = useState("balanced");
  const [provider, setProvider] = useState<Provider>("ollama");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("0.4");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [contextWindow, setContextWindow] = useState("128k");
  const [tools, setTools] = useState(toolDefaults);
  const [channels, setChannels] = useState(channelDefaults);
  const [plugins, setPlugins] = useState(pluginDefaults);
  const [safety, setSafety] = useState(safetyDefaults);
  const [automation, setAutomation] = useState(automationDefaults);
  const [memory, setMemory] = useState(memoryDefaults);
  const [integrations, setIntegrations] = useState(integrationDefaults);
  const [notifications, setNotifications] = useState(notificationDefaults);
  const [logLevel, setLogLevel] = useState("info");
  const [traceSample, setTraceSample] = useState("15");
  const [runtimeConcurrency, setRuntimeConcurrency] = useState("3");
  const [executionTimeout, setExecutionTimeout] = useState("180");
  const [gpuEnabled, setGpuEnabled] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [composerValue, setComposerValue] = useState("");
  const [composerRows, setComposerRows] = useState(1);
  const [isConfigOpen, _setIsConfigOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  // Track streaming state per conversation
  const streamingStatesRef = useRef<Map<string, StreamingState>>(new Map());
  const pendingMessagesRef = useRef<Map<string, { userMsg: ChatItem; assistantMsg: ChatItem }>>(new Map());

  useEffect(() => {
    if (provider === "ollama" && ollamaModels.length > 0 && !model) {
      setModel(ollamaModels[0].name);
    }
  }, [ollamaModels, model, provider]);

  const handleSelectModel = useCallback((newModel: string, newProvider: Provider) => {
    setModel(newModel);
    setProvider(newProvider);
  }, []);

  useEffect(() => {
    if (!isLoadingConversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [isLoadingConversations, conversations, activeConversationId]);

  const handleSelectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.items.length === 0) {
      await loadConversation(id);
    }
  }, [conversations, loadConversation]);

  useEffect(() => {
    const lines = composerValue.split("\n").length;
    setComposerRows(Math.min(6, Math.max(1, lines)));
  }, [composerValue]);

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

  const handleToolChange = (key: ToolKey, checked: boolean) => {
    setTools((prev) => ({ ...prev, [key]: checked }));
  };

  const handleChannelChange = (key: ChannelKey, checked: boolean) => {
    setChannels((prev) => ({ ...prev, [key]: checked }));
  };

  const handlePluginChange = (key: PluginKey, checked: boolean) => {
    setPlugins((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSafetyChange = (key: SafetyKey, checked: boolean) => {
    setSafety((prev) => ({ ...prev, [key]: checked }));
  };

  const handleAutomationChange = (key: AutomationKey, checked: boolean) => {
    setAutomation((prev) => ({ ...prev, [key]: checked }));
  };

  const handleMemoryChange = (key: MemoryKey, checked: boolean) => {
    setMemory((prev) => ({ ...prev, [key]: checked }));
  };

  const handleIntegrationChange = (key: IntegrationKey, checked: boolean) => {
    setIntegrations((prev) => ({ ...prev, [key]: checked }));
  };

  const handleNotificationChange = (key: NotificationKey, checked: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: checked }));
  };

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ),
    [conversations, activeConversationId],
  );

  const activeRun = useMemo(() => {
    if (!activeRunId) return null;
    for (const conversation of conversations) {
      for (const item of conversation.items) {
        if (item.kind === "execution" && item.run.id === activeRunId) {
          return item.run;
        }
      }
    }
    return null;
  }, [activeRunId, conversations]);

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
      setActiveConversationId(existingEmpty.id);
      return;
    }

    const newConv = await createConversation("New conversation");
    if (newConv) {
      setActiveConversationId(newConv.id);
    }
  }, [conversations, createConversation]);

  const handleRenameConversation = useCallback((id: string) => {
    console.log("Rename:", id);
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversationDb(id);
    if (activeConversationId === id && conversations.length > 1) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining[0]?.id ?? "");
    }
  }, [deleteConversationDb, activeConversationId, conversations]);

  const handleDuplicateConversation = (id: string) => {
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
  };

  const handleExportConversation = (id: string) => {
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
  };

  const handleArchiveConversation = (id: string) => {
    // TODO: Implementar lógica de arquivamento (mover para lista arquivada)
    console.log("Archive:", id);
  };

  const handleSendMessage = useCallback(async () => {
    if (!activeConversation || !composerValue.trim()) return;
    // Only block if this specific conversation is already streaming
    if (hasRunningExecution || streamingStatesRef.current.has(activeConversation.id)) return;
    if (!model) return;

    // Check provider availability
    if (provider === "ollama" && !connectionState.isConnected) return;
    if (provider === "openai" && !auth.status?.openai.is_configured) return;
    if (provider === "anthropic" && !auth.status?.anthropic.is_configured) return;

    const now = Date.now();
    const messageId = buildMessageId();
    const assistantId = buildMessageId();
    const sessionId = `session-${now}`;
    const userContent = composerValue.trim();
    const conversationId = activeConversation.id;

    // Register streaming state for this conversation
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

    pendingMessagesRef.current.set(sessionId, { userMsg: userMessage, assistantMsg: assistantMessage });

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
          status: "running",
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

    const conversationHistory: ChatMessage[] = activeConversation.items
      .filter((item) => item.kind === "message")
      .map((item) => ({
        role: item.message.role as "user" | "assistant" | "system",
        content: item.message.content,
      }));

    conversationHistory.push({ role: "user", content: userContent });

    // API key is resolved automatically by useChatProvider
    // (checks env vars, Claude Code keychain, then manual settings)
    startChatStream({
      sessionId,
      provider,
      model,
      messages: conversationHistory,
      temperature: parseFloat(temperature) || 0.7,
      maxTokens: parseInt(maxTokens) || 4096,
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
              if (item.id !== currentMessageId || item.kind !== "message") return item;
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
              status: done ? "idle" : "running",
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

          pendingMessagesRef.current.delete(sessionId);
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
              if (item.id !== currentMessageId || item.kind !== "message") return item;
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
              status: "error",
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

        pendingMessagesRef.current.delete(sessionId);
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
    temperature,
    maxTokens,
    startChatStream,
    addMessage,
    updateConversation,
    setConversations,
  ]);

  const tab = (
    <ConversationSidebar
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onRenameConversation={handleRenameConversation}
      onDeleteConversation={handleDeleteConversation}
      onDuplicateConversation={handleDuplicateConversation}
      onExportConversation={handleExportConversation}
      onArchiveConversation={handleArchiveConversation}
    />
  );

  const tabs = [
    {
      id: 0,
      label: "chat",
      content: (tab),
    },
    {
      id: 1,
      label: "work",
      content: (tab),
    },
    {
      id: 2,
      label: "code",
      content: (tab),
    },
  ];

  return (
    <div className="text-foreground relative h-full min-h-0 overflow-hidden">
      <TextureOverlay texture="grid" className="mix-blend-overlay" />
      <div className="relative z-10 flex h-full min-h-0">
        <aside className="flex w-[300px] flex-col items-center">
          <DirectionAwareTabs onChange={() => { }} tabs={tabs} className="mt-10 rounded-lg" />
        </aside>


        <section className="flex min-w-0 flex-1 flex-col mr-3 my-3 rounded-3xl border-border border overflow-hidden bg-background">
          {/* <ConversationHeader
            activeConversation={activeConversation}
            isConfigOpen={isConfigOpen}
            onToggleConfig={() => setIsConfigOpen((prev) => !prev)}
          /> */}

          {isConfigOpen ? (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ConfigPanel
                model={model}
                setModel={setModel}
                temperature={temperature}
                setTemperature={setTemperature}
                maxTokens={maxTokens}
                setMaxTokens={setMaxTokens}
                contextWindow={contextWindow}
                setContextWindow={setContextWindow}
                runtimeConcurrency={runtimeConcurrency}
                setRuntimeConcurrency={setRuntimeConcurrency}
                executionTimeout={executionTimeout}
                setExecutionTimeout={setExecutionTimeout}
                gpuEnabled={gpuEnabled}
                setGpuEnabled={setGpuEnabled}
                logLevel={logLevel}
                setLogLevel={setLogLevel}
                traceSample={traceSample}
                setTraceSample={setTraceSample}
                tools={tools}
                handleToolChange={handleToolChange}
                channels={channels}
                handleChannelChange={handleChannelChange}
                plugins={plugins}
                handlePluginChange={handlePluginChange}
                safety={safety}
                handleSafetyChange={handleSafetyChange}
                automation={automation}
                handleAutomationChange={handleAutomationChange}
                memory={memory}
                handleMemoryChange={handleMemoryChange}
                integrations={integrations}
                handleIntegrationChange={handleIntegrationChange}
                notifications={notifications}
                handleNotificationChange={handleNotificationChange}
              />
            </div>
          ) : null}

          {!isConfigOpen ? (
            <div className="flex min-h-0 relative flex-1 flex-col">
              <ConversationThread
                activeConversation={activeConversation}
                onViewRun={setActiveRunId}
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
                  />
                }
              />
            </div>
          ) : null}
        </section>
      </div>

      <RunDetailsModal
        activeRun={activeRun}
        onClose={() => setActiveRunId(null)}
      />
    </div>
  );
}
