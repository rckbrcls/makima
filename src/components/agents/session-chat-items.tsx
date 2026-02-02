import {
  AlertCircle,
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCode,
  Folder,
  GitBranch,
  Globe,
  Info,
  Loader2,
  Shield,
  Terminal,
  User,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { getActionTypeLabel, getStatusColor } from "./types";
import type {
  Check
} from "lucide-react";
import type {
  Action,
  ActionStatus,
  ActionType,
  AgentEvent,
  EventLevel,
} from "./types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

// ============================================================================
// Icons
// ============================================================================

export const actionTypeIcons: Record<ActionType, typeof Terminal> = {
  run_command: Terminal,
  start_dev_server: Zap,
  stop_dev_server: XCircle,
  read_file: FileCode,
  write_file: FileCode,
  edit_file: FileCode,
  list_files: Folder,
  delete_file: XCircle,
  search_web: Globe,
  open_url: Globe,
  git_status: GitBranch,
  git_diff: GitBranch,
  git_checkout: GitBranch,
  git_commit: GitBranch,
  notify: AlertTriangle,
  sleep: Clock,
};

export const statusIcons: Record<ActionStatus, typeof Check> = {
  pending: Clock,
  running: Loader2,
  done: CheckCircle2,
  failed: XCircle,
  blocked: Shield,
  rejected: X,
};

export const eventLevelIcons: Record<EventLevel, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  debug: Bug,
};

export const eventLevelColors: Record<EventLevel, string> = {
  info: "text-blue-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-400",
};

// ============================================================================
// Helpers
// ============================================================================

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// Event Message
// ============================================================================

interface EventMessageProps {
  event: AgentEvent;
}

export function EventMessage({ event }: EventMessageProps) {
  const Icon = eventLevelIcons[event.level];
  const isUser = event.source === "user";

  // Shared container styles
  const containerClass = cn(
    "flex w-full mb-4 px-4",
    isUser ? "justify-end" : "justify-start"
  );

  const contentContainerClass = cn(
    "max-w-3xl flex flex-col",
    isUser ? "items-end" : "items-start"
  );

  const metaClass = cn(
    "text-muted-foreground flex items-center gap-2 text-xs mb-2",
    isUser && "justify-end"
  );

  const bubbleClass = cn(
    "rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
    isUser
      ? "border-primary bg-primary text-primary-foreground rounded-tr-sm"
      : "border-border bg-card rounded-tl-sm"
  );

  if (event.level === "debug") return null;

  return (
    <div className={containerClass}>
      <div className={contentContainerClass}>
        {/* Meta Row */}
        <div className={metaClass}>
          <div
            className={cn(
              "flex size-6 items-center justify-center rounded-full border",
              isUser
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted"
            )}
          >
            {isUser ? (
              <User className="size-3" />
            ) : (
              <Icon className="size-3" />
            )}
          </div>
          <span className="font-medium">
            {isUser ? "You" : "System"}
          </span>
          <span>{formatTime(event.createdAt)}</span>
        </div>

        {/* Message Bubble */}
        <div className={bubbleClass}>
          {event.message}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Action Message
// ============================================================================

interface ActionMessageProps {
  action: Action;
}

export function ActionMessage({ action }: ActionMessageProps) {
  const TypeIcon = actionTypeIcons[action.actionType] ?? Terminal;
  const isRunning = action.status === "running";
  const isDone = action.status === "done";
  const isFailed = action.status === "failed" || action.status === "rejected";

  // Parse payload safely
  const payload = (() => {
    try {
      return JSON.parse(action.payload);
    } catch {
      return {};
    }
  })();

  // Determine message content based on action type
  let title = getActionTypeLabel(action.actionType);
  let content: React.ReactNode = null;
  let text = action.summary; // fallback

  // Special rendering for specific actions
  switch (action.actionType) {
    case "run_command":
    case "start_dev_server":
      title = "Executing Command";
      text = payload.command;
      content = (
        <div className="border-border mt-2 overflow-x-auto rounded border bg-zinc-900 p-2.5 font-mono text-xs whitespace-pre-wrap text-green-400 dark:bg-black">
          $ {payload.command}
        </div>
      );
      break;
    case "read_file":
    case "write_file":
    case "edit_file":
    case "delete_file":
      title = action.actionType
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      text = payload.path;
      content = (
        <div className="bg-muted border-border text-foreground mt-2 rounded border p-2 font-mono text-xs break-all">
          {payload.path}
        </div>
      );
      break;
    case "notify":
      title = "Agent Says";
      text = payload.message;
      content = (
        <div className="text-foreground border-primary mt-2 border-l-2 py-1 pl-3 text-sm">
          {payload.message}
        </div>
      );
      break;
    default:
    // Generic JSON view for others
  }

  return (
    <div className="flex w-full justify-start px-4 mb-4">
      <div className="max-w-3xl w-full">
        {/* Meta Row */}
        <div className="text-muted-foreground flex items-center gap-2 text-xs mb-2">
          <div className={cn(
            "flex size-6 items-center justify-center rounded-full border border-border bg-muted",
            isDone && "border-green-500/30 bg-green-500/10 text-green-500",
            isFailed && "border-destructive/30 bg-destructive/10 text-destructive",
            isRunning && "border-primary/30 bg-primary/10 text-primary"
          )}>
            {isRunning ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <TypeIcon className="size-3" />
            )}
          </div>
          <span className="font-medium">Agent</span>
          <span>{formatTime(action.createdAt)}</span>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto h-4 px-1 text-[0.6rem] uppercase",
              getStatusColor(action.status),
            )}
          >
            {action.status}
          </Badge>
        </div>

        {/* Card Content */}
        <div
          className={cn(
            "group rounded-xl border border-border bg-card p-4 shadow-sm",
            isFocussedAction(action) && "ring-1 ring-primary/20",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
          </div>

          {/* Main Content */}
          {action.actionType === "notify" ? (
            content
          ) : (
            <div className="text-muted-foreground text-sm">
              {text && <p className="line-clamp-2 leading-relaxed">{text}</p>}
              {content}
            </div>
          )}

          {/* Payload/Output Details Collapsible */}
          {action.actionType !== "notify" && (
            <CollapsibleDetails payload={payload} action={action} />
          )}
        </div>
      </div>
    </div>
  );
}

function CollapsibleDetails({
  payload,
  action,
}: {
  payload: any;
  action: Action;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Specific formatting for writing/editing
  const isCodeChange =
    action.actionType === "write_file" || action.actionType === "edit_file";
  const codeContent = payload.content || payload.diff;

  // Don't show collapsible if there's no extra interesting info
  if (!codeContent && Object.keys(payload).length <= 1) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-6 px-0 text-xs"
        >
          {isOpen ? (
            <ChevronDown className="mr-1 size-3" />
          ) : (
            <ChevronRight className="mr-1 size-3" />
          )}
          {isCodeChange ? "View Code Change" : "View Details"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isCodeChange && codeContent ? (
          <div className="border-border bg-muted relative mt-2 overflow-hidden rounded-md border p-3">
            <pre className="overflow-x-auto font-mono text-xs">
              <code>{codeContent}</code>
            </pre>
          </div>
        ) : (
          <div className="border-border bg-muted mt-2 overflow-hidden rounded-md border p-3">
            <pre className="text-muted-foreground overflow-x-auto font-mono text-xs">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function isFocussedAction(action: Action) {
  return action.status === "running" || action.status === "blocked";
}
