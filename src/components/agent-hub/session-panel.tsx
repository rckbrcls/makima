import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Check,
  CheckCircle2,
  Clock,
  FileCode,
  Folder,
  GitBranch,
  Globe,
  Loader2,
  Play,
  Shield,
  Square,
  Terminal,
  X,
  XCircle,
  Zap,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Action,
  ActionStatus,
  ActionType,
  AgentEvent,
  EventLevel,
  Session,
  SessionState,
} from "./types"
import { getActionTypeLabel, getStatusColor } from "./types"

// ============================================================================
// Icons
// ============================================================================

const actionTypeIcons: Record<ActionType, typeof Terminal> = {
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
}

const statusIcons: Record<ActionStatus, typeof Check> = {
  pending: Clock,
  running: Loader2,
  done: CheckCircle2,
  failed: XCircle,
  blocked: Shield,
  rejected: X,
}

const eventLevelIcons: Record<EventLevel, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  debug: Bug,
}

const eventLevelColors: Record<EventLevel, string> = {
  info: "text-blue-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-400",
}

// ============================================================================
// Action Item
// ============================================================================

interface ActionItemProps {
  action: Action
}

function ActionItem({ action }: ActionItemProps) {
  const TypeIcon = actionTypeIcons[action.actionType] ?? Terminal
  const StatusIcon = statusIcons[action.status]
  const isRunning = action.status === "running"

  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/40 last:border-0">
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center border",
          action.status === "done"
            ? "border-green-500/30 bg-green-500/10 text-green-500"
            : action.status === "failed" || action.status === "rejected"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : action.status === "blocked"
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                : "border-border bg-muted text-muted-foreground"
        )}
      >
        <TypeIcon className="size-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">
            {action.summary ?? getActionTypeLabel(action.actionType)}
          </span>
          <StatusIcon
            className={cn(
              "size-3 shrink-0",
              getStatusColor(action.status),
              isRunning && "animate-spin"
            )}
          />
        </div>
        <span className="text-[0.6rem] text-muted-foreground">
          {new Date(action.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <Badge
        variant="outline"
        className={cn("text-[0.5rem] uppercase shrink-0", getStatusColor(action.status))}
      >
        {action.status}
      </Badge>
    </div>
  )
}

// ============================================================================
// Event Item
// ============================================================================

interface EventItemProps {
  event: AgentEvent
}

function EventItem({ event }: EventItemProps) {
  const Icon = eventLevelIcons[event.level]

  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className={cn("size-3 shrink-0 mt-0.5", eventLevelColors[event.level])} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.65rem] text-foreground/90 break-words">
          {event.message}
        </p>
        <span className="text-[0.55rem] text-muted-foreground">
          {new Date(event.createdAt).toLocaleTimeString()} · {event.source}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface SessionPanelProps {
  session: Session
  actions: Action[]
  events: AgentEvent[]
  onEndSession?: (success: boolean) => void
  isLoading?: boolean
}

export function SessionPanel({
  session,
  actions,
  events,
  onEndSession,
  isLoading,
}: SessionPanelProps) {
  const [activeTab, setActiveTab] = useState<"actions" | "events">("actions")

  const isActive = session.state === "active"
  const pendingActions = actions.filter((a) => a.status === "pending" || a.status === "blocked")
  const completedActions = actions.filter((a) => a.status === "done")
  const failedActions = actions.filter((a) => a.status === "failed" || a.status === "rejected")

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="size-4" />
            Session
          </CardTitle>
          <Badge
            variant="outline"
            className={cn("text-[0.6rem] uppercase", getStatusColor(session.state))}
          >
            {session.state === "active" ? (
              <Loader2 className="size-3 mr-1 animate-spin" />
            ) : session.state === "done" ? (
              <CheckCircle2 className="size-3 mr-1" />
            ) : (
              <XCircle className="size-3 mr-1" />
            )}
            {session.state}
          </Badge>
        </div>
        <CardDescription className="text-[0.7rem]">
          {session.goal ?? `Session ${session.id.slice(0, 8)}`}
        </CardDescription>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-2 text-[0.6rem] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3 text-green-500" />
            {completedActions.length} done
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-yellow-500" />
            {pendingActions.length} pending
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="size-3 text-destructive" />
            {failedActions.length} failed
          </span>
        </div>
      </CardHeader>

      {/* Tabs */}
      <div className="flex border-b border-border/60">
        <button
          className={cn(
            "flex-1 py-2 text-xs font-medium transition-colors",
            activeTab === "actions"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("actions")}
        >
          Actions ({actions.length})
        </button>
        <button
          className={cn(
            "flex-1 py-2 text-xs font-medium transition-colors",
            activeTab === "events"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("events")}
        >
          Events ({events.length})
        </button>
      </div>

      {/* Content */}
      <CardContent className="flex-1 overflow-y-auto p-3">
        {activeTab === "actions" ? (
          actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Terminal className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No actions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {actions.map((action) => (
                <ActionItem key={action.id} action={action} />
              ))}
            </div>
          )
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No events yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer */}
      {isActive && onEndSession && (
        <>
          <Separator />
          <div className="p-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-green-500/30 text-green-500 hover:bg-green-500/10"
              onClick={() => onEndSession(true)}
              disabled={isLoading}
            >
              <CheckCircle2 className="size-3 mr-1" />
              Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => onEndSession(false)}
              disabled={isLoading}
            >
              <Square className="size-3 mr-1" />
              Stop
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
