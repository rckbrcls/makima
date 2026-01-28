import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Activity, CircleDot } from "lucide-react"
import { cn } from "@/lib/utils"
import { repoStatusColor, getRepo, groupByRepo } from "@/lib/command-hub/helpers"
import { statusStyles } from "@/lib/command-hub/constants"
import type { ExecutionHistoryItem, ExecutionLogLine, Repository } from "./types"

interface HistoryListProps {
  history: ExecutionHistoryItem[]
  selectedRepo: string | null
  repositories: Repository[]
  getExecutionLogs?: (executionId: number) => Promise<ExecutionLogLine[]>
}

function HistoryExecutionCard({
  run,
  getExecutionLogs,
}: {
  run: ExecutionHistoryItem
  getExecutionLogs?: (executionId: number) => Promise<ExecutionLogLine[]>
}) {
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
      .catch(() => {
        if (!active) return
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
    <Card className="flex flex-col border-border/60 bg-card/85">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="size-4 text-primary" />
          Execution
        </CardTitle>
        <Badge
          variant="outline"
          className={cn("text-[0.6rem] uppercase", statusStyles[run.status])}
        >
          {run.status}
        </Badge>
        <CardDescription>
          {run.repo} | {run.name}
        </CardDescription>
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
                : "bg-chart-1/70"
            )}
          />
        </div>
        <div className="space-y-1 rounded-none border border-border bg-muted/80 p-3 text-[0.65rem] text-foreground">
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

export function HistoryList({
  history,
  selectedRepo,
  repositories,
  getExecutionLogs,
}: HistoryListProps) {
  const groupedHistory = groupByRepo(history)

  return (
    <div className="space-y-2">
      {selectedRepo === null ? (
        /* Grouped by repo */
        Object.entries(groupedHistory).map(([repoName, runs]) => (
          <div key={repoName}>
            <div className="mb-2 flex items-center gap-2 text-[0.65rem] font-medium text-foreground">
              <CircleDot
                className={cn(
                  "size-2.5",
                  repoStatusColor(
                    getRepo(repoName, repositories)?.status ?? "idle"
                  )
                )}
              />
              {repoName}
            </div>
            <div className="space-y-3">
              {runs.map((run) => (
                <HistoryExecutionCard
                  key={run.id}
                  run={run}
                  getExecutionLogs={getExecutionLogs}
                />
              ))}
            </div>
            <Separator className="my-2 bg-border/60" />
          </div>
        ))
      ) : (
        /* Flat filtered list */
        <div className="space-y-3">
          {history.map((run) => (
            <HistoryExecutionCard
              key={run.id}
              run={run}
              getExecutionLogs={getExecutionLogs}
            />
          ))}
        </div>
      )}
    </div>
  )
}
