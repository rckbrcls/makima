import { CheckCircle2, Loader2, PauseCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  Conversation,
  ConversationState,
  ConversationStatus,
  RunStatus,
} from "@/components/main/jarvis-types";

export const createEmptyConversation = (): Conversation => {
  const now = Date.now();
  return {
    id: `conv-${now}`,
    title: "New conversation",
    summary: "No messages yet",
    status: "idle",
    state: "active",
    createdAt: now,
    updatedAt: now,
    items: [],
  };
};

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
