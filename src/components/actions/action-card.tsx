import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  FileCode,
  Folder,
  GitBranch,
  Globe,
  Loader2,
  Shield,
  Terminal,
  X,
  XCircle,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Action, ActionStatus, ActionType, Session } from "@/components/agents/types"
import { getActionRisk, getActionTypeLabel, getStatusColor } from "@/components/agents/types"

// Action type icons mapping
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

interface ActionCardProps {
  action: Action
  session?: Session
  agentName?: string
  onClick?: (action: Action) => void
}

export function ActionCard({
  action,
  session,
  agentName,
  onClick,
}: ActionCardProps) {
  const TypeIcon = actionTypeIcons[action.actionType] ?? Terminal
  const StatusIcon = statusIcons[action.status]
  const risk = getActionRisk(action.actionType)
  const isRunning = action.status === "running"

  // Try to parse payload for preview
  let payloadPreview = ""
  try {
    const payload = JSON.parse(action.payload)
    if (payload.command) payloadPreview = payload.command
    else if (payload.path) payloadPreview = payload.path
    else if (payload.message) payloadPreview = payload.message
  } catch {
    payloadPreview = action.payload.slice(0, 50)
  }

  return (
    <Card
      className={cn(
        "border-border/70 bg-card transition-colors",
        onClick && "cursor-pointer hover:border-primary/50"
      )}
      onClick={() => onClick?.(action)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center border",
                risk === "high"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : risk === "medium"
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                    : "border-border bg-muted text-muted-foreground"
              )}
            >
              <TypeIcon className="size-3.5" />
            </span>
            <div>
              <CardTitle className="text-sm line-clamp-1">
                {action.summary ?? getActionTypeLabel(action.actionType)}
              </CardTitle>
              <CardDescription className="text-[0.65rem] truncate max-w-[200px]">
                {payloadPreview}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={cn("text-[0.55rem] uppercase", getStatusColor(action.status))}
            >
              <StatusIcon
                className={cn("size-3 mr-1", isRunning && "animate-spin")}
              />
              {action.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[0.5rem] uppercase",
                risk === "high"
                  ? "border-destructive/30 text-destructive"
                  : risk === "medium"
                    ? "border-yellow-500/30 text-yellow-500"
                    : "border-green-500/30 text-green-500"
              )}
            >
              {risk}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
          {agentName && <span>Agent: {agentName}</span>}
          {session && (
            <span className="truncate max-w-[120px]">
              {session.goal?.slice(0, 20)}...
            </span>
          )}
          <span>
            {new Date(action.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
