import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { statusStyles } from "@/lib/command-hub/constants"
import type { ExecutionHistoryItem, ExecutionLogLine } from "./types"

interface HistoryExecutionCardProps {
  run: ExecutionHistoryItem
  getExecutionLogs?: (executionId: number) => Promise<ExecutionLogLine[]>
}

export function HistoryExecutionCard({
  run,
  getExecutionLogs,
}: HistoryExecutionCardProps) {
  const [logs, setLogs] = useState<ExecutionLogLine[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!getExecutionLogs) {
      setLogs([])
      return () => {
        active = false
      }
    }
    setLoading(true)
    getExecutionLogs(run.id)
      .then((entries) => {
        if (!active) return
        setLogs(entries)
      })
      .catch((err) => {
        if (!active) return
        console.error("[HistoryExecutionCard] failed to load logs for execution", run.id, err)
        setLogs([])
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [getExecutionLogs, run.id])

  return (
    <Card className="flex flex-col border-border/60 bg-card">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          {run.name}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className={cn("text-[0.6rem] uppercase", statusStyles[run.status])}
          >
            {run.status}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
          <span>Duration: {run.duration}</span>
          <span>{run.timestamp}</span>
        </div>
        <div className="h-1 w-full overflow-hidden border border-border bg-muted">
          <div
            className={cn(
              "h-full w-full",
              run.status === "failed"
                ? "bg-destructive/70"
                : run.status === "stopped"
                  ? "bg-muted-foreground/70"
                  : "bg-chart-1/70"
            )}
          />
        </div>
        <div className="space-y-1 rounded-md border border-border bg-muted/80 p-3 text-[0.65rem] text-foreground">
          {loading ? (
            <div className="text-muted-foreground">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-muted-foreground">No logs saved yet.</div>
          ) : (
            logs.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  entry.stream === "stderr" && "text-destructive",
                  entry.line.includes("failed") && "text-destructive"
                )}
              >
                {entry.line}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
