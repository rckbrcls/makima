import {
  Terminal,
  Zap,
  XCircle,
  FileCode,
  Folder,
  Globe,
  GitBranch,
  AlertTriangle,
  Clock,
  Check,
  Loader2,
  CheckCircle2,
  Shield,
  X,
  Info,
  Bug,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Action,
  ActionStatus,
  ActionType,
  AgentEvent,
  EventLevel,
} from "./types"
import { getActionTypeLabel, getStatusColor } from "./types"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import { Button } from "@/components/ui/button"

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
}

export const statusIcons: Record<ActionStatus, typeof Check> = {
  pending: Clock,
  running: Loader2,
  done: CheckCircle2,
  failed: XCircle,
  blocked: Shield,
  rejected: X,
}

export const eventLevelIcons: Record<EventLevel, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  debug: Bug,
}

export const eventLevelColors: Record<EventLevel, string> = {
  info: "text-blue-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  debug: "text-gray-400",
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ============================================================================
// Event Message
// ============================================================================

interface EventMessageProps {
  event: AgentEvent
}

export function EventMessage({ event }: EventMessageProps) {
  const Icon = eventLevelIcons[event.level]
  const isUser = event.source === 'user'

  if (event.level === 'debug') return null // Optionally hide debug logs to reduce noise

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3">
        <div className="max-w-[80%] bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-tr-none shadow-sm">
          <p className="text-sm break-words whitespace-pre-wrap">{event.message}</p>
          <div className="text-[0.6rem] text-primary-foreground/70 mt-1 flex justify-end">
            {formatTime(event.createdAt)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 px-4 py-2 opacity-80 hover:opacity-100 transition-opacity">
      <div className={cn("mt-1 shrink-0", eventLevelColors[event.level])}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">
          System • {formatTime(event.createdAt)}
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{event.message}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Action Message
// ============================================================================

interface ActionMessageProps {
  action: Action
}

export function ActionMessage({ action }: ActionMessageProps) {
  const TypeIcon = actionTypeIcons[action.actionType] ?? Terminal
  const isRunning = action.status === "running"
  const isDone = action.status === "done"
  const isFailed = action.status === "failed" || action.status === "rejected"

  // Parse payload safely
  const payload = (() => {
    try {
      return JSON.parse(action.payload)
    } catch {
      return {}
    }
  })()

  // Determine message content based on action type
  let title = getActionTypeLabel(action.actionType)
  let content: React.ReactNode = null
  let text = action.summary // fallback

  // Special rendering for specific actions
  switch (action.actionType) {
    case 'run_command':
    case 'start_dev_server':
      title = "Executing Command"
      text = payload.command
      content = (
        <div className="mt-2 text-xs font-mono bg-black/40 p-2.5 rounded border border-border/50 text-green-400 overflow-x-auto whitespace-pre-wrap">
          $ {payload.command}
        </div>
      )
      break
    case 'read_file':
    case 'write_file':
    case 'edit_file':
    case 'delete_file':
      title = action.actionType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      text = payload.path
      content = (
        <div className="mt-2 text-xs font-mono bg-muted/40 p-2 rounded border border-border/50 text-foreground/80 break-all">
          {payload.path}
        </div>
      )
      break
    case 'notify':
      title = "Agent Says"
      text = payload.message
      content = (
        <div className="mt-2 text-sm text-foreground border-l-2 border-primary/50 pl-3 py-1">
          {payload.message}
        </div>
      )
      break
    default:
    // Generic JSON view for others
  }


  return (
    <div className={cn(
      "flex gap-3 px-4 py-3 group",
      isFocussedAction(action) && "bg-muted/10"
    )}>
      <div className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border shadow-sm mt-0.5",
        isDone
          ? "border-green-500/30 bg-green-500/10 text-green-500"
          : isFailed
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : action.status === "blocked"
              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
              : "border-border bg-background text-muted-foreground"
      )}>
        {isRunning ? <Loader2 className="size-4 animate-spin" /> : <TypeIcon className="size-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground font-normal">• {formatTime(action.createdAt)}</span>
          {!isRunning && !isDone && (
            <Badge variant="outline" className={cn("text-[0.6rem] h-4 px-1 ml-auto uppercase", getStatusColor(action.status))}>
              {action.status}
            </Badge>
          )}
        </div>

        {/* Main Content */}
        {action.actionType === 'notify' ? (
          content
        ) : (
          <div className="text-sm text-muted-foreground">
            {text && <p className="line-clamp-2 leading-relaxed">{text}</p>}
            {content}
          </div>
        )}

        {/* Payload/Output Details Collapsible */}
        {(action.actionType !== 'notify') && (
          <CollapsibleDetails payload={payload} action={action} />
        )}

      </div>
    </div>
  )
}

function CollapsibleDetails({ payload, action }: { payload: any, action: Action }) {
  const [isOpen, setIsOpen] = useState(false)

  // Specific formatting for writing/editing
  const isCodeChange = action.actionType === 'write_file' || action.actionType === 'edit_file'
  const codeContent = payload.content || payload.diff

  // Don't show collapsible if there's no extra interesting info
  if (!codeContent && Object.keys(payload).length <= 1) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-0 text-xs text-muted-foreground hover:text-foreground">
          {isOpen ? <ChevronDown className="size-3 mr-1" /> : <ChevronRight className="size-3 mr-1" />}
          {isCodeChange ? "View Code Change" : "View Details"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isCodeChange && codeContent ? (
          <div className="mt-2 relative rounded-md border border-border bg-muted/30 p-3 overflow-hidden">
            <pre className="text-xs font-mono overflow-x-auto">
              <code>{codeContent}</code>
            </pre>
          </div>
        ) : (
          <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 overflow-hidden">
            <pre className="text-xs font-mono overflow-x-auto text-muted-foreground">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function isFocussedAction(action: Action) {
  return action.status === 'running' || action.status === 'blocked'
}
