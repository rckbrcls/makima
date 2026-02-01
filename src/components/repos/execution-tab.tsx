import { LiveExecutionCard } from "./live-execution-card"
import { HistoryList } from "./history-list"
import type {
  ExecutionHistoryItem,
  ExecutionLogLine,
  LiveExecution,
  Repository,
} from "./types"

interface ExecutionTabProps {
  selectedRepo: string | null
  liveExecutions: LiveExecution[]
  repositories: Repository[]
  executionHistory: ExecutionHistoryItem[]
  getExecutionLogs: (executionId: number) => Promise<ExecutionLogLine[]>
  onStopCommand?: (repo: string, commandName: string) => void
}

export function ExecutionTab({
  selectedRepo,
  liveExecutions,
  repositories,
  executionHistory,
  getExecutionLogs,
  onStopCommand,
}: ExecutionTabProps) {
  return (
    <div className="flex flex-col gap-4 py-4 pr-6 pl-1 overflow-y-auto">
      {/* Live execution cards */}
      {liveExecutions.map((exec) => (
        <LiveExecutionCard
          key={`${exec.repo}-${exec.command}`}
          execution={exec}
          onStop={onStopCommand}
        />
      ))}

      {/* Execution history list */}
      <HistoryList
        history={executionHistory}
        selectedRepo={selectedRepo}
        repositories={repositories}
        getExecutionLogs={getExecutionLogs}
      />
    </div>
  )
}
