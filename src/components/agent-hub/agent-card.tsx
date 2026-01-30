import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertTriangle,
  Bot,
  Play,
  Settings,
  Trash2,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent, AgentStatus } from "./types"

// ============================================================================
// Status Styling
// ============================================================================

const statusStyles: Record<AgentStatus, string> = {
  active: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  idle: "border-border/50 bg-muted/50 text-muted-foreground",
  running: "border-green-500/30 bg-green-500/10 text-green-400",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
}

const statusIcons: Record<AgentStatus, typeof Bot> = {
  active: Zap,
  idle: Clock,
  running: Play,
  error: XCircle,
}

// ============================================================================
// Component
// ============================================================================

interface AgentCardProps {
  agent: Agent
  index?: number
  pendingCount?: number
  onConfigure?: (agent: Agent) => void
  onDelete?: (agent: Agent) => void
  onStartSession?: (agent: Agent) => void
  onClick?: (agent: Agent) => void
}

export function AgentCard({
  agent,
  index = 0,
  pendingCount = 0,
  onConfigure,
  onDelete,
  onStartSession,
  onClick,
}: AgentCardProps) {
  const StatusIcon = statusIcons[agent.status]

  const handleClick = () => {
    onClick?.(agent)
  }

  return (
    <Card
      size="sm"
      className={cn(
        "border-border/70 bg-card animate-in fade-in slide-in-from-bottom-8 duration-700 cursor-pointer hover:border-primary/50 transition-colors",
        index % 2 === 0 ? "delay-200" : "delay-300"
      )}
      onClick={handleClick}
    >
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-7 items-center justify-center border border-border bg-muted text-foreground/80">
            <Bot className="size-4" />
          </span>
          {agent.name}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge
              variant="outline"
              className={cn("text-[0.6rem] uppercase", statusStyles[agent.status])}
            >
              <StatusIcon className="size-3 mr-1" />
              {agent.status}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[0.6rem]">
                {pendingCount} pending
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-primary"
              aria-label={`Configure ${agent.name}`}
              onClick={() => onConfigure?.(agent)}
            >
              <Settings className="size-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${agent.name}`}
                  disabled={agent.status === "running"}
                >
                  <Trash2 className="size-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="text-destructive">
                    <AlertTriangle />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Delete agent?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {agent.name} and all associated sessions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete?.(agent)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardAction>
        <CardDescription className="text-[0.7rem] text-muted-foreground">
          {agent.model ?? agent.provider} · {agent.id.slice(0, 8)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
          <span>provider: {agent.provider}</span>
          <span className="text-foreground/80">
            updated: {new Date(agent.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden border border-border bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-500",
              agent.status === "running"
                ? "w-3/4 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.8s_linear_infinite]"
                : agent.status === "active"
                  ? "w-1/2 bg-blue-500/70"
                  : agent.status === "error"
                    ? "w-full bg-destructive/70"
                    : "w-0"
            )}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
          <CheckCircle2 className="size-3" />
          Ready
        </div>
        <Button
          size="xs"
          className="h-6 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => onStartSession?.(agent)}
          disabled={agent.status === "running"}
        >
          <Play data-icon="inline-start" />
          New Session
        </Button>
      </CardFooter>
    </Card>
  )
}
