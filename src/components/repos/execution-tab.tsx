import { LiveExecutionCard } from "./live-execution-card"
import { HistoryList } from "./history-list"
import type {
  ExecutionHistoryItem,
  ExecutionLogLine,
  LiveExecution,
  Repository,
} from "./types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

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

  const [open, setOpen] = useState(true)

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

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <ChevronDown className={cn("size-4 transition-transform duration-500", open ? "rotate-180" : "")} />
            <p className="text-sm font-medium text-neutral-200">History</p>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 transition-all duration-500">
          <HistoryList
            history={executionHistory}
            selectedRepo={selectedRepo}
            repositories={repositories}
            getExecutionLogs={getExecutionLogs}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
