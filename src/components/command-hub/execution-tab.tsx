import { LiveExecutionCard } from "./live-execution-card"
import { ExecutionQueueCard } from "./execution-queue-card"
import { BuildStepsCard } from "./build-steps-card"
import type { LiveExecution, Pipeline, Repository, RunQueueItem } from "./types"

interface ExecutionTabProps {
  selectedRepo: string | null
  liveExecutions: LiveExecution[]
  queue: RunQueueItem[]
  pipelines: Pipeline[]
  repositories: Repository[]
  onStopCommand?: (repo: string, commandName: string) => void
}

export function ExecutionTab({
  selectedRepo,
  liveExecutions,
  queue,
  pipelines,
  repositories,
  onStopCommand,
}: ExecutionTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Live execution cards */}
      <div className="flex flex-col gap-4">
        {liveExecutions.map((exec) => (
          <LiveExecutionCard
            key={`${exec.repo}-${exec.command}`}
            execution={exec}
            onStop={onStopCommand}
          />
        ))}
      </div>

      {/* Right column: queue + build steps */}
      <div className="flex flex-col gap-4">
        <ExecutionQueueCard queue={queue} />
        <BuildStepsCard
          pipelines={pipelines}
          selectedRepo={selectedRepo}
          repositories={repositories}
        />
      </div>
    </div>
  )
}
