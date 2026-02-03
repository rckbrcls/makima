import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  PauseCircle,
  Plus,
  Send,
  Settings,
  User,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AutomationKey,
  ChannelKey,
  IntegrationKey,
  MemoryKey,
  NotificationKey,
  PluginKey,
  SafetyKey,
  ToolKey
} from "@/components/jarvis/config-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import { ConfigPanel } from "@/components/jarvis/config-panel";
import { Blob3D } from "@/components/visuals/blob-3d";
import {
  automationDefaults,
  channelDefaults,
  integrationDefaults,
  memoryDefaults,
  notificationDefaults,
  pluginDefaults,
  safetyDefaults,
  toolDefaults,
} from "@/components/jarvis/config-types";
import { cn } from "@/lib/utils";

type ConversationStatus = "idle" | "running" | "error";
type ConversationState = "active" | "finished" | "error";
type GlobalState = "ok" | "warning" | "error";
type MessageState = "normal" | "thinking" | "streaming" | "error";
type MessageRole = "user" | "assistant";
type RunStatus = "running" | "success" | "error" | "cancelled";

interface MessageMeta {
  provider: string;
  model: string;
  tone: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  state: MessageState;
  content: string;
  createdAt: number;
  meta: MessageMeta;
  streamedChars?: number;
}

interface ExecutionStep {
  id: string;
  label: string;
  status: "pending" | "running" | "success" | "error";
}

interface ExecutionRun {
  id: string;
  title: string;
  command: string;
  status: RunStatus;
  duration: string;
  output: string;
  startedAt: number;
  finishedAt?: number;
  summary: string;
  steps: Array<ExecutionStep>;
  logs: Array<string>;
}

type ChatItem =
  | { id: string; kind: "message"; message: ChatMessage }
  | { id: string; kind: "execution"; run: ExecutionRun };

interface Conversation {
  id: string;
  title: string;
  summary: string;
  status: ConversationStatus;
  state: ConversationState;
  createdAt: number;
  updatedAt: number;
  globalState?: GlobalState;
  items: Array<ChatItem>;
}

const baseTimestamp = Date.now();
const minutes = (value: number) => value * 60 * 1000;
const hours = (value: number) => value * 60 * 60 * 1000;

const defaultMessageMeta: MessageMeta = {
  provider: "openclaw",
  model: "claw-sonic",
  tone: "balanced",
};

const mockConversations: Array<Conversation> = [
  {
    id: "conv-refactor",
    title: "Refactor repo",
    summary: "Chat-first + history with mocked executions",
    status: "running",
    state: "active",
    createdAt: baseTimestamp - hours(3),
    updatedAt: baseTimestamp - minutes(3),
    items: [
      {
        id: "msg-101",
        kind: "message",
        message: {
          id: "msg-101",
          role: "user",
          state: "normal",
          content:
            "Can you refactor the UI to be chat-first and keep the settings panel?",
          createdAt: baseTimestamp - hours(2),
          meta: defaultMessageMeta,
        },
      },
      {
        id: "msg-102",
        kind: "message",
        message: {
          id: "msg-102",
          role: "assistant",
          state: "thinking",
          content: "Thinking...",
          createdAt: baseTimestamp - hours(2) + minutes(4),
          meta: defaultMessageMeta,
        },
      },
      {
        id: "run-101",
        kind: "execution",
        run: {
          id: "run-101",
          title: "Lint workspace",
          command: "pnpm lint",
          status: "running",
          duration: "0:21",
          output: "Linting 42 files...",
          summary: "Validating code standards before applying the refactoring.",
          startedAt: baseTimestamp - minutes(4),
          steps: [
            { id: "step-101", label: "Install deps", status: "success" },
            { id: "step-102", label: "Run ESLint", status: "running" },
            { id: "step-103", label: "Collect report", status: "pending" },
          ],
          logs: [
            "[init] bootstrapping workspace",
            "[deps] pnpm install --frozen-lockfile",
            "[lint] eslint src/**/*.tsx",
            "[lint] warning: 3 unused vars",
            "[lint] waiting on rules...",
          ],
        },
      },
      {
        id: "msg-103",
        kind: "message",
        message: {
          id: "msg-103",
          role: "assistant",
          state: "streaming",
          content:
            "I'm reorganizing the layout to prioritize the chat, keeping the settings panel intact inside the Expandable.",
          createdAt: baseTimestamp - minutes(2),
          meta: defaultMessageMeta,
          streamedChars: 0,
        },
      },
    ],
  },
  {
    id: "conv-ci",
    title: "Setup CI",
    summary: "Pipeline with tests and build",
    status: "idle",
    state: "finished",
    createdAt: baseTimestamp - hours(6),
    updatedAt: baseTimestamp - hours(4),
    items: [
      {
        id: "msg-201",
        kind: "message",
        message: {
          id: "msg-201",
          role: "user",
          state: "normal",
          content: "I need a simple pipeline with lint and test.",
          createdAt: baseTimestamp - hours(6) + minutes(10),
          meta: { provider: "openclaw", model: "claw-sonic", tone: "direct" },
        },
      },
      {
        id: "msg-202",
        kind: "message",
        message: {
          id: "msg-202",
          role: "assistant",
          state: "normal",
          content:
            "Ok. I will assemble the workflow with cache and sequential steps.",
          createdAt: baseTimestamp - hours(6) + minutes(14),
          meta: { provider: "openclaw", model: "claw-sonic", tone: "direct" },
        },
      },
      {
        id: "run-201",
        kind: "execution",
        run: {
          id: "run-201",
          title: "Run tests",
          command: "pnpm test",
          status: "success",
          duration: "0:48",
          output: "92 tests passed",
          summary: "Test suite completed successfully.",
          startedAt: baseTimestamp - hours(6) + minutes(15),
          finishedAt: baseTimestamp - hours(6) + minutes(16),
          steps: [
            { id: "step-201", label: "Install deps", status: "success" },
            { id: "step-202", label: "Run tests", status: "success" },
            { id: "step-203", label: "Upload artifacts", status: "success" },
          ],
          logs: [
            "[deps] pnpm install --frozen-lockfile",
            "[test] vitest run",
            "[test] 92 passed, 0 failed",
            "[artifact] coverage uploaded",
          ],
        },
      },
      {
        id: "msg-203",
        kind: "message",
        message: {
          id: "msg-203",
          role: "assistant",
          state: "normal",
          content:
            "CI applied and validated. Do you want to add a deploy preview?",
          createdAt: baseTimestamp - hours(6) + minutes(17),
          meta: {
            provider: "openclaw",
            model: "claw-vision",
            tone: "balanced",
          },
        },
      },
    ],
  },
  {
    id: "conv-debug",
    title: "Debug build error",
    summary: "Build failure in a critical step",
    status: "error",
    state: "error",
    globalState: "error",
    createdAt: baseTimestamp - hours(9),
    updatedAt: baseTimestamp - hours(7),
    items: [
      {
        id: "msg-301",
        kind: "message",
        message: {
          id: "msg-301",
          role: "user",
          state: "normal",
          content: "The build is failing on esbuild, can you investigate?",
          createdAt: baseTimestamp - hours(9) + minutes(30),
          meta: defaultMessageMeta,
        },
      },
      {
        id: "msg-302",
        kind: "message",
        message: {
          id: "msg-302",
          role: "assistant",
          state: "error",
          content:
            "Failed to resolve external dependencies. I need permission to review the full logs.",
          createdAt: baseTimestamp - hours(9) + minutes(33),
          meta: defaultMessageMeta,
        },
      },
      {
        id: "run-301",
        kind: "execution",
        run: {
          id: "run-301",
          title: "Build workspace",
          command: "pnpm build",
          status: "error",
          duration: "1:12",
          output: "esbuild: missing plugin",
          summary: "Execution failed while loading the bundling plugin.",
          startedAt: baseTimestamp - hours(9) + minutes(31),
          finishedAt: baseTimestamp - hours(9) + minutes(33),
          steps: [
            { id: "step-301", label: "Install deps", status: "success" },
            { id: "step-302", label: "Build packages", status: "error" },
            { id: "step-303", label: "Collect logs", status: "pending" },
          ],
          logs: [
            "[build] pnpm build",
            "[build] esbuild error: Cannot find plugin 'astro'",
            "[build] exit code 1",
          ],
        },
      },
    ],
  },
  {
    id: "conv-long",
    title: "Migration plan",
    summary: "Long conversation with multiple executions",
    status: "idle",
    state: "finished",
    createdAt: baseTimestamp - hours(14),
    updatedAt: baseTimestamp - hours(11),
    items: [
      {
        id: "msg-401",
        kind: "message",
        message: {
          id: "msg-401",
          role: "user",
          state: "normal",
          content:
            "I need to migrate the entire layout without breaking the configuration.",
          createdAt: baseTimestamp - hours(14) + minutes(5),
          meta: { provider: "openclaw", model: "claw-sonic", tone: "concise" },
        },
      },
      {
        id: "msg-402",
        kind: "message",
        message: {
          id: "msg-402",
          role: "assistant",
          state: "normal",
          content: "I will map UI dependencies and create a step-by-step plan.",
          createdAt: baseTimestamp - hours(14) + minutes(7),
          meta: { provider: "openclaw", model: "claw-sonic", tone: "concise" },
        },
      },
      {
        id: "msg-403",
        kind: "message",
        message: {
          id: "msg-403",
          role: "assistant",
          state: "normal",
          content: "Step 1: separate history, chat, and fixed input.",
          createdAt: baseTimestamp - hours(14) + minutes(9),
          meta: { provider: "openclaw", model: "claw-sonic", tone: "concise" },
        },
      },
      {
        id: "msg-404",
        kind: "message",
        message: {
          id: "msg-404",
          role: "assistant",
          state: "normal",
          content:
            "Step 2: embed settings in the Expandable and maintain local states.",
          createdAt: baseTimestamp - hours(14) + minutes(11),
          meta: { provider: "openclaw", model: "claw-sonic", tone: "concise" },
        },
      },
      {
        id: "run-401",
        kind: "execution",
        run: {
          id: "run-401",
          title: "Generate layout map",
          command: "node scripts/layout-map.js",
          status: "success",
          duration: "0:33",
          output: "Layout map stored in /tmp/ui-map.json",
          summary: "Visual map generated to support the migration.",
          startedAt: baseTimestamp - hours(14) + minutes(12),
          finishedAt: baseTimestamp - hours(14) + minutes(13),
          steps: [
            { id: "step-401", label: "Scan components", status: "success" },
            { id: "step-402", label: "Build map", status: "success" },
            { id: "step-403", label: "Export JSON", status: "success" },
          ],
          logs: [
            "[scan] 87 components found",
            "[map] generating relationships",
            "[export] ui-map.json saved",
          ],
        },
      },
      {
        id: "msg-405",
        kind: "message",
        message: {
          id: "msg-405",
          role: "assistant",
          state: "normal",
          content:
            "I have a draft. Do you want me to prepare the list of mocks?",
          createdAt: baseTimestamp - hours(14) + minutes(14),
          meta: { provider: "openclaw", model: "gpt-4o", tone: "creative" },
        },
      },
      {
        id: "run-402",
        kind: "execution",
        run: {
          id: "run-402",
          title: "Run preview build",
          command: "pnpm build --filter ui",
          status: "cancelled",
          duration: "0:57",
          output: "Interrupted by user",
          summary: "Execution interrupted to adjust the strategy.",
          startedAt: baseTimestamp - hours(13) + minutes(20),
          finishedAt: baseTimestamp - hours(13) + minutes(21),
          steps: [
            { id: "step-404", label: "Compile UI", status: "running" },
            { id: "step-405", label: "Stop run", status: "error" },
          ],
          logs: [
            "[build] pnpm build --filter ui",
            "[build] waiting on deps...",
            "[build] cancelled by operator",
          ],
        },
      },
      {
        id: "msg-406",
        kind: "message",
        message: {
          id: "msg-406",
          role: "assistant",
          state: "normal",
          content:
            "No problem. I will continue in mock mode to validate flows.",
          createdAt: baseTimestamp - hours(13) + minutes(24),
          meta: { provider: "openclaw", model: "gpt-4o", tone: "balanced" },
        },
      },
    ],
  },
  {
    id: "conv-empty",
    title: "New conversation",
    summary: "No messages yet",
    status: "idle",
    state: "active",
    createdAt: baseTimestamp - minutes(10),
    updatedAt: baseTimestamp - minutes(10),
    items: [],
  },
];

const mockResponsePool = [
  "Understood. I will focus on the chat-first experience and keep the settings panel intact.",
  "Perfect. I will set up rich mocks for executions, errors, and local history.",
  "Right. I will simulate streaming and different states for openClaw.",
];

const conversationStatusMeta: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  idle: { label: "Idle", className: "border-emerald-500 bg-emerald-600 text-emerald-950" },
  running: { label: "Running", className: "border-yellow-500 bg-yellow-600 text-yellow-950" },
  error: { label: "Error", className: "border-red-500 bg-red-600 text-red-950" },
};

const conversationStateMeta: Record<
  ConversationState,
  { label: string; className: string }
> = {
  active: { label: "Active", className: "border-sky-500 bg-sky-600 text-sky-950" },
  finished: {
    label: "Finished",
    className: "border-emerald-500 bg-emerald-600 text-emerald-950",
  },
  error: { label: "Error", className: "border-red-500 bg-red-600 text-red-950" },
};

const runStatusMeta: Record<
  RunStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  running: {
    label: "Running",
    className: "border-yellow-500 bg-yellow-600 text-yellow-950",
    icon: Loader2,
  },
  success: {
    label: "Success",
    className: "border-emerald-500 bg-emerald-600 text-emerald-950",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    className: "border-red-500 bg-red-600 text-red-950",
    icon: XCircle,
  },
  cancelled: {
    label: "Interrupted",
    className: "border-orange-500 text-orange-500",
    icon: PauseCircle,
  },
};

const inputStateMeta = {
  idle: { label: "Idle", className: "bg-emerald-500" },
  thinking: { label: "Thinking", className: "bg-yellow-500" },
  executing: { label: "Executing", className: "bg-sky-500" },
};

const formatRelativeTime = (timestamp: number) => {
  const diff = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.floor(diff / 60000);
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

const formatClock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const getConversationPreview = (conversation: Conversation) => {
  const lastItem = conversation.items[conversation.items.length - 1];
  if (!lastItem) return "No messages yet.";
  if (lastItem.kind === "execution") return `Run: ${lastItem.run.title}`;
  if (!lastItem.message.content) return "No messages yet.";
  return lastItem.message.content.length > 80
    ? `${lastItem.message.content.slice(0, 80)}...`
    : lastItem.message.content;
};

const buildMessageId = () =>
  `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export function JarvisPage() {
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

  return (
    <div className="bg-background text-foreground relative h-full min-h-0 overflow-hidden">
      <TextureOverlay texture="noise" className="mix-blend-overlay" />
      <div className="relative z-10 flex h-full min-h-0">
        <aside className="border-border bg-card flex w-[280px] flex-col border-r">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-bold font-serif">CHATS</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNewConversation}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {conversations.map((conversation) => {
              const statusMeta = conversationStatusMeta[conversation.status];
              const isActive = conversation.id === activeConversationId;

              return (
                <button
                  key={conversation.id}
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    isActive
                      ? "border-primary/15 bg-primary/10"
                      : "border-border bg-card hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-foreground text-sm font-medium">
                          {conversation.title}
                        </p>
                        {conversation.globalState === "error" ? (
                          <AlertTriangle className="size-3 text-rose-500" />
                        ) : null}
                      </div>

                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      {formatRelativeTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-2 text-xs">
                    {getConversationPreview(conversation)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", statusMeta.className)}
                    >
                      {statusMeta.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="bg-card border-border flex flex-wrap items-start gap-4 border-b px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <Bot className="text-primary size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {activeConversation?.title ?? "Conversations"}
                  </h2>
                  {activeConversation ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        conversationStateMeta[activeConversation.state]
                          .className,
                      )}
                    >
                      {conversationStateMeta[activeConversation.state].label}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  {activeConversation?.summary ??
                    "Select a conversation to start."}
                </p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {/* <Badge variant="outline" className="text-[10px]">
                Provider: {provider}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Model: {model}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Tone: {tone}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Safe: {safety.safeMode ? "On" : "Off"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Tools: {toolCount}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Channels: {channelCount}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Plugins: {pluginCount}
              </Badge> */}

              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9", isConfigOpen && "bg-muted")}
                aria-label="Settings"
                onClick={() => setIsConfigOpen((prev) => !prev)}
              >
                <Settings className={cn("size-4", isConfigOpen && "hidden")} />
                <X className={cn("size-4", !isConfigOpen && "hidden")} />
              </Button>
            </div>
          </div>

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
            <div className="flex min-h-0 flex-1 flex-col">
              {activeConversation?.globalState === "error" ? (
                <div className="mx-6 mt-4 rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 text-red-500" />
                    <div>
                      <p className="font-medium">Global error detected</p>
                      <p className="text-xs text-red-200">
                        This conversation indicates a critical failure. The
                        local history has been preserved.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                {activeConversation && activeConversation.items.length > 0 ? (
                  activeConversation.items.map((item) => {
                    if (item.kind === "execution") {
                      const statusMeta = runStatusMeta[item.run.status];
                      const StatusIcon = statusMeta.icon;

                      return (
                        <div key={item.id} className="max-w-3xl">
                          <Card className="border-border bg-card shadow-sm">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={cn(
                                      "flex size-10 items-center justify-center rounded-lg border",
                                      statusMeta.className,
                                    )}
                                  >
                                    <StatusIcon className="size-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {item.run.title}
                                    </p>
                                    <p className="text-muted-foreground font-mono text-xs">
                                      {item.run.command}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    statusMeta.className,
                                  )}
                                >
                                  {statusMeta.label}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                                <span>Duration: {item.run.duration}</span>
                                <span>
                                  Start: {formatClock(item.run.startedAt)}
                                </span>
                                {item.run.finishedAt ? (
                                  <span>
                                    End: {formatClock(item.run.finishedAt)}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-foreground text-sm">
                                {item.run.output}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {item.run.summary}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveRunId(item.run.id)}
                              >
                                View full run
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    }

                    const isUser = item.message.role === "user";
                    const isError = item.message.state === "error";
                    const isThinkingMessage = item.message.state === "thinking";
                    const isStreamingMessage =
                      item.message.state === "streaming";
                    const visibleText = isStreamingMessage
                      ? item.message.content.slice(
                        0,
                        item.message.streamedChars ?? 0,
                      )
                      : item.message.content;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex w-full",
                          isUser ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-3xl",
                            isUser ? "text-right" : "text-left",
                          )}
                        >
                          <div
                            className={cn(
                              "text-muted-foreground flex items-center gap-2 text-xs",
                              isUser && "justify-end",
                            )}
                          >
                            <div
                              className={cn(
                                "flex size-6 items-center justify-center rounded-full border",
                                isUser
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-muted",
                              )}
                            >
                              {isUser ? (
                                <User className="size-3" />
                              ) : (
                                <Bot className="size-3" />
                              )}
                            </div>
                            <span className="font-medium">
                              {isUser ? "You" : "openClaw"}
                            </span>
                            <span>{formatClock(item.message.createdAt)}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {item.message.meta.model}
                            </Badge>
                            <Badge variant="outline" className="text-[9px]">
                              {item.message.meta.tone}
                            </Badge>
                          </div>
                          <div
                            className={cn(
                              "mt-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                              isUser
                                ? "border-primary bg-primary text-primary-foreground"
                                : isError
                                  ? "border-red-900 bg-red-950 text-red-200"
                                  : "border-border bg-card",
                            )}
                          >
                            {isThinkingMessage ? (
                              <span className="text-muted-foreground text-xs">
                                Thinking...
                              </span>
                            ) : (
                              <span>
                                {visibleText}
                                {isStreamingMessage ? (
                                  <span className="inline-block w-2 animate-pulse">
                                    ▍
                                  </span>
                                ) : null}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Blob3D className="h-[320px] w-full max-w-3xl sm:h-[360px]" />
                  </div>
                )}
              </div>

              <div className="border-border bg-card border-t px-6 py-4">
                <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        inputStateMeta[inputState].className,
                      )}
                    />
                    <span>State: {inputStateMeta[inputState].label}</span>
                  </div>
                  <span>
                    {hasRunningExecution
                      ? "Input blocked during execution"
                      : ""}
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <Textarea
                    value={composerValue}
                    onChange={(event) => setComposerValue(event.target.value)}
                    rows={composerRows}
                    placeholder="Write your message (without openClaw memory)..."
                    disabled={hasRunningExecution}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={hasRunningExecution || !composerValue.trim()}
                    className="gap-2"
                  >
                    <Send className="size-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {activeRun ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6"
          onClick={() => setActiveRunId(null)}
        >
          <Card
            className="border-border bg-background max-h-[85vh] w-full max-w-4xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <CardHeader className="border-border border-b">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{activeRun.title}</CardTitle>
                  <CardDescription>{activeRun.command}</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    runStatusMeta[activeRun.status].className,
                  )}
                >
                  {runStatusMeta[activeRun.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 py-6 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Timeline
                </p>
                <div className="space-y-2">
                  {activeRun.steps.map((step) => (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                        step.status === "success"
                          ? "border-emerald-500 bg-emerald-600 text-emerald-950"
                          : step.status === "error"
                            ? "border-red-500 bg-red-600 text-red-950"
                            : step.status === "running"
                              ? "border-yellow-500 bg-yellow-600 text-yellow-950"
                              : "border-border/60 text-muted-foreground",
                      )}
                    >
                      <span>{step.label}</span>
                      <span className="text-[10px] uppercase">
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Full logs
                </p>
                <div className="border-border/60 bg-muted/30 max-h-[320px] overflow-y-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
                  {activeRun.logs.join("\n")}
                </div>
                <p className="text-muted-foreground text-xs">
                  {activeRun.summary}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
