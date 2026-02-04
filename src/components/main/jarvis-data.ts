import { CheckCircle2, Loader2, PauseCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  Conversation,
  ConversationState,
  ConversationStatus,
  MessageMeta,
  RunStatus,
} from "@/components/main/jarvis-types";

const baseTimestamp = Date.now();
const minutes = (value: number) => value * 60 * 1000;
const hours = (value: number) => value * 60 * 60 * 1000;

export const defaultMessageMeta: MessageMeta = {
  provider: "openclaw",
  model: "claw-sonic",
  tone: "balanced",
};

export const mockConversations: Array<Conversation> = [
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

export const mockResponsePool = [
  "Understood. I will focus on the chat-first experience and keep the settings panel intact.",
  "Perfect. I will set up rich mocks for executions, errors, and local history.",
  "Right. I will simulate streaming and different states for openClaw.",
];

export const conversationStatusMeta: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  idle: {
    label: "Idle",
    className: "border-emerald-500 bg-emerald-600 text-emerald-950",
  },
  running: {
    label: "Running",
    className: "border-yellow-500 bg-yellow-600 text-yellow-950",
  },
  error: {
    label: "Error",
    className: "border-red-500 bg-red-600 text-red-950",
  },
};

export const conversationStateMeta: Record<
  ConversationState,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "border-sky-500 bg-sky-600 text-sky-950",
  },
  finished: {
    label: "Finished",
    className: "border-emerald-500 bg-emerald-600 text-emerald-950",
  },
  error: {
    label: "Error",
    className: "border-red-500 bg-red-600 text-red-950",
  },
};

export const runStatusMeta: Record<
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

export const inputStateMeta = {
  idle: { label: "Idle", className: "bg-emerald-500" },
  thinking: { label: "Thinking", className: "bg-yellow-500" },
  executing: { label: "Executing", className: "bg-sky-500" },
} as const;

export const formatRelativeTime = (timestamp: number) => {
  const diff = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.floor(diff / 60000);
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

export const formatClock = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const getConversationPreview = (conversation: Conversation) => {
  const lastItem = conversation.items[conversation.items.length - 1];
  if (!lastItem) return "No messages yet.";
  if (lastItem.kind === "execution") return `Run: ${lastItem.run.title}`;
  if (!lastItem.message.content) return "No messages yet.";
  return lastItem.message.content.length > 80
    ? `${lastItem.message.content.slice(0, 80)}...`
    : lastItem.message.content;
};

export const buildMessageId = () =>
  `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
