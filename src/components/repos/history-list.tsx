import { Separator } from "@/components/ui/separator"
import { CircleDot } from "lucide-react"
import { cn } from "@/lib/utils"
import { repoStatusColor, getRepo, groupByRepo } from "@/lib/command-hub/helpers"
import { HistoryExecutionCard } from "./history-execution-card"
import type { ExecutionHistoryItem, ExecutionLogLine, Repository } from "./types"

interface HistoryListProps {
  history: ExecutionHistoryItem[]
  selectedRepo: string | null
  repositories: Repository[]
  getExecutionLogs?: (executionId: number) => Promise<ExecutionLogLine[]>
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
