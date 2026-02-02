import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Play,
  Settings,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import type { Agent, AgentStatus } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// Status Styling
// ============================================================================

const statusStyles: Record<AgentStatus, string> = {
  active: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  idle: "border-border/50 bg-muted/50 text-muted-foreground",
  running: "border-green-500/30 bg-green-500/10 text-green-400",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

const statusIcons: Record<AgentStatus, typeof Bot> = {
  active: Zap,
  idle: Clock,
  running: Play,
  error: XCircle,
};

// ============================================================================
// Component
// ============================================================================

interface AgentCardProps {
  agent: Agent;
  index?: number;
  pendingCount?: number;
  onConfigure?: (agent: Agent) => void;
  onDelete?: (agent: Agent) => void;
  onStartSession?: (agent: Agent) => void;
  onClick?: (agent: Agent) => void;
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
  const StatusIcon = statusIcons[agent.status];

  const handleClick = () => {
    onClick?.(agent);
  };

  return (
    <Card
      className={cn(
        "border-border bg-card animate-in fade-in slide-in-from-bottom-8 hover:border-primary flex shrink-0 cursor-pointer flex-col justify-between",
      )}
      onClick={handleClick}
    >
      <CardHeader className="border-border/60 flex flex-col items-start gap-4 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="border-border bg-muted text-foreground/80 flex size-8 items-center justify-center rounded-md border">
            <Bot className="size-4" />
          </span>
          {agent.name}
          <div
            className="flex w-full items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Badge
              variant="outline"
              className={cn(
                "text-[0.6rem] uppercase",
                statusStyles[agent.status],
              )}
            >
              <StatusIcon className="mr-1 size-3" />
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
        </div>
        <div className="text-muted-foreground flex w-full flex-row items-center gap-2 text-[0.7rem] text-nowrap">
          {agent.model ?? agent.provider}
          <span className="text-foreground/80">· {agent.id.slice(0, 8)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-muted-foreground flex items-center justify-between text-[0.65rem]">
          <span>provider: {agent.provider}</span>
          <span className="text-foreground/80">
            updated: {new Date(agent.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="border-border bg-muted h-1 w-full overflow-hidden border">
          <div
            className={cn(
              "h-full transition-all duration-500",
              agent.status === "running"
                ? "from-chart-1 via-chart-2 to-chart-1/80 w-3/4 animate-[shimmer_2.8s_linear_infinite] bg-gradient-to-r bg-[length:200%_100%]"
                : agent.status === "active"
                  ? "w-1/2 bg-blue-500/70"
                  : agent.status === "error"
                    ? "bg-destructive/70 w-full"
                    : "w-0",
            )}
          />
        </div>
      </CardContent>
      <CardFooter
        className="justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-muted-foreground flex items-center gap-2 text-[0.65rem]">
          <CheckCircle2 className="size-3" />
          Ready
        </div>
        <Button
          size="xs"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-6"
          onClick={() => onStartSession?.(agent)}
          disabled={agent.status === "running"}
        >
          <Play data-icon="inline-start" />
          New Session
        </Button>
      </CardFooter>
    </Card>
  );
}
