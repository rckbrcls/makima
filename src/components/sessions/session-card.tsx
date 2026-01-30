import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent, Session, SessionState } from "@/components/agents/types"

const stateStyles: Record<SessionState, string> = {
  active: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  done: "border-green-500/30 bg-green-500/10 text-green-400",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
}

const stateIcons: Record<SessionState, typeof Clock> = {
  active: Loader2,
  done: CheckCircle2,
  failed: XCircle,
}

interface SessionCardProps {
  session: Session
  agent?: Agent
  actionCount?: number
  onClick?: (session: Session) => void
}

export function SessionCard({
  session,
  agent,
  actionCount = 0,
  onClick,
}: SessionCardProps) {
  const StateIcon = stateIcons[session.state]
  const isActive = session.state === "active"

  return (
    <Card
      className={cn(
        "border-border/70 bg-card cursor-pointer hover:border-primary/50 transition-colors",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(session)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center border border-border bg-muted text-foreground/80">
              <Play className="size-3.5" />
            </span>
            <div>
              <CardTitle className="text-sm line-clamp-1">
                {session.goal || `Session ${session.id.slice(0, 8)}`}
              </CardTitle>
              <CardDescription className="text-[0.65rem]">
                {session.id.slice(0, 8)} · {new Date(session.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[0.6rem] uppercase", stateStyles[session.state])}
          >
            <StateIcon className={cn("size-3 mr-1", isActive && "animate-spin")} />
            {session.state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
          {agent && (
            <div className="flex items-center gap-1">
              <Bot className="size-3" />
              <span>{agent.name}</span>
            </div>
          )}
          <span>{actionCount} action(s)</span>
          <span>
            {new Date(session.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
