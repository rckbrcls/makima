import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, CircleDot, History, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { repoStatusColor, getRepo, groupByRepo } from "@/lib/command-hub/helpers"
import { statusStyles } from "@/lib/command-hub/constants"
import type { ExecutionHistoryItem, Repository } from "./types"

interface HistoryListProps {
  history: ExecutionHistoryItem[]
  selectedRepo: string | null
  repositories: Repository[]
}

export function HistoryList({
  history,
  selectedRepo,
  repositories,
}: HistoryListProps) {
  const groupedHistory = groupByRepo(history)

  return (
    <Card className="flex flex-col border-border/60 bg-card/85">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="size-4 text-primary" />
          Past executions
        </CardTitle>
        <CardDescription>Browse previous runs and their results.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="mb-1 flex items-center justify-between border border-border/60 bg-card/70 px-3 py-2.5 transition hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    {run.status === "success" ? (
                      <CheckCircle2 className="size-4 text-chart-1" />
                    ) : (
                      <XCircle className="size-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {run.name}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground">
                        {run.repo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[0.65rem] text-muted-foreground">
                      {run.duration}
                    </span>
                    <span className="text-[0.6rem] text-muted-foreground/70">
                      {run.timestamp}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[0.6rem] uppercase",
                        statusStyles[run.status]
                      )}
                    >
                      {run.status}
                    </Badge>
                  </div>
                </div>
              ))}
              <Separator className="my-2 bg-border/60" />
            </div>
          ))
        ) : (
          /* Flat filtered list */
          history.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between border border-border/60 bg-card/70 px-3 py-2.5 transition hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                {run.status === "success" ? (
                  <CheckCircle2 className="size-4 text-chart-1" />
                ) : (
                  <XCircle className="size-4 text-destructive" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {run.name}
                  </p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    {run.repo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[0.65rem] text-muted-foreground">
                  {run.duration}
                </span>
                <span className="text-[0.6rem] text-muted-foreground/70">
                  {run.timestamp}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[0.6rem] uppercase", statusStyles[run.status])}
                >
                  {run.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
