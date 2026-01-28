import { ExecutionQueueCard } from "./execution-queue-card"
import { BuildStepsCard } from "./build-steps-card"
import type { Pipeline, Repository, RunQueueItem } from "./types"

interface PipelineTabProps {
  selectedRepo: string | null
  queue: RunQueueItem[]
  pipelines: Pipeline[]
  repositories: Repository[]
}

export function PipelineTab({
  selectedRepo,
  queue,
  pipelines,
  repositories,
}: PipelineTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <BuildStepsCard
        pipelines={pipelines}
        selectedRepo={selectedRepo}
        repositories={repositories}
      />
      <ExecutionQueueCard queue={queue} />
    </div>
  )
}
