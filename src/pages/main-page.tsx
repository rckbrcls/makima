import { useEffect, useMemo, useState } from "react";
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
import {
  buildMessageId,
  mockConversations,
  mockResponsePool,
} from "@/components/main/jarvis-data";
import type {
  ChatItem,
  ChatMessage,
  Conversation,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types";
import { RunDetailsModal } from "@/components/main/run-details-modal";
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { TextureOverlay } from "@/components/ui/texture-overlay";

export function MainPage() {
  const [tone,] = useState("balanced");
  const [provider,] = useState("openclaw");
  const [model, setModel] = useState("claw-sonic");
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

  const [conversations, setConversations] =
    useState<Array<Conversation>>(mockConversations);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    mockConversations[0]?.id ?? '"',
  );
  const [composerValue, setComposerValue] = useState("");
  const [composerRows, setComposerRows] = useState(1);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

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
  }, []);

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

  const toolCount = Object.values(tools).filter(Boolean).length;
  const channelCount = Object.values(channels).filter(Boolean).length;
  const pluginCount = Object.values(plugins).filter(Boolean).length;

  const handleNewConversation = () => {
    const now = Date.now();
    const newConversation: Conversation = {
      id: `conv-${now}`,
      title: "New conversation",
      summary: "No messages yet",
      status: "idle",
      state: "active",
      createdAt: now,
      updatedAt: now,
      items: [],
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const handleSendMessage = () => {
    if (!activeConversation || !composerValue.trim()) return;
    if (hasRunningExecution) return;

    const now = Date.now();
    const messageId = buildMessageId();
    const thinkingId = buildMessageId();
    const streamingId = buildMessageId();
    const responseText =
      mockResponsePool[Math.floor(Math.random() * mockResponsePool.length)];

    const userMessage: ChatItem = {
      id: messageId,
      kind: "message",
      message: {
        id: messageId,
        role: "user",
        state: "normal",
        content: composerValue.trim(),
        createdAt: now,
        meta: { provider, model, tone },
      },
    };

    const thinkingMessage: ChatItem = {
      id: thinkingId,
      kind: "message",
      message: {
        id: thinkingId,
        role: "assistant",
        state: "thinking",
        content: "Thinking...",
        createdAt: now + 200,
        meta: { provider, model, tone },
      },
    };

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== activeConversation.id) return conversation;
        const nextTitle =
          conversation.title === "New conversation" ||
            conversation.items.length === 0
            ? composerValue.trim().slice(0, 32)
            : conversation.title;
        return {
          ...conversation,
          title: nextTitle,
          summary: composerValue.trim().slice(0, 60) || conversation.summary,
          status: "running",
          updatedAt: now,
          items: [...conversation.items, userMessage, thinkingMessage],
        };
      }),
    );

    setComposerValue("");

    setTimeout(() => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== activeConversation.id) return conversation;

          const nextItems = conversation.items.map((item) =>
            item.id === thinkingId
              ? {
                id: streamingId,
                kind: "message" as const,
                message: {
                  id: streamingId,
                  role: "assistant",
                  state: "streaming",
                  content: responseText,
                  createdAt: Date.now(),
                  meta: { provider, model, tone },
                  streamedChars: 0,
                } as ChatMessage,
              }
              : item,
          );

          return {
            ...conversation,
            status: "running",
            updatedAt: Date.now(),
            items: nextItems,
          };
        }),
      );
    }, 650);
  };

  const tab = (
    <ConversationSidebar
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={setActiveConversationId}
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
