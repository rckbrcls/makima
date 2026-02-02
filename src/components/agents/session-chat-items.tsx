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

  if (event.level === "debug") return null; // Optionally hide debug logs to reduce noise

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3">
        <div className="bg-primary text-primary-foreground max-w-[80%] rounded-lg rounded-tr-none px-3 py-2 shadow-sm">
          <p className="text-sm break-words whitespace-pre-wrap">
            {event.message}
          </p>
          <div className="text-primary-foreground mt-1 flex justify-end text-[0.6rem] opacity-70">
            {formatTime(event.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hover:bg-muted flex gap-3 px-4 py-2 transition-colors">
      <div className={cn("mt-1 shrink-0", eventLevelColors[event.level])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground mb-0.5 text-xs">
          System • {formatTime(event.createdAt)}
        </div>
        <p className="text-foreground text-sm whitespace-pre-wrap">
          {event.message}
        </p>
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
    <div
      className={cn(
        "group flex gap-3 px-4 py-3",
        isFocussedAction(action) && "bg-card border-border border-y",
      )}
    >
      <div
        className={cn(
          "bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
          isDone && "border-green-500 text-green-500",
          isFailed && "border-destructive text-destructive",
          action.status === "blocked" && "border-yellow-500 text-yellow-500",
          !isDone &&
          !isFailed &&
          action.status !== "blocked" &&
          "border-border text-muted-foreground",
        )}
      >
        {isRunning ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <TypeIcon className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-muted-foreground text-xs font-normal">
            • {formatTime(action.createdAt)}
          </span>
          {!isRunning && !isDone && (
            <Badge
              variant="outline"
              className={cn(
                "ml-auto h-4 px-1 text-[0.6rem] uppercase",
                getStatusColor(action.status),
              )}
            >
              {action.status}
            </Badge>
          )}
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
