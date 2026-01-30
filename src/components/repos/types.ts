import type { ElementType } from "react"

export type RepositoryStatus = "active" | "idle" | "warn"
export type CommandStatus = "running" | "queued" | "success" | "failed" | "stopped" | "idle"
export type CommandType = "run" | "build" | "test" | "lint" | "check" | "bundle"
export type StepState = "done" | "running" | "pending"

export interface Repository {
  name: string
  path: string
  branch: string
  status: RepositoryStatus
  tech: string[]
  lastRun: string
  running: string
}

export interface NewRepositoryInput {
  name: string
  path: string
  branch: string
  tech: string[]
}

export interface Command {
  name: string
  command: string
  type: CommandType
  status: CommandStatus
  duration: string
  lastRun: string
  repo: string
}

export interface LiveExecution {
  repo: string
  command: string
  pid: number
  cpu: string
  ram: string
  logs: ExecutionLogLine[]
}

export interface ExecutionLogLine {
  line: string
  stream: "stdout" | "stderr" | string
}

export interface RunQueueItem {
  id: number
  name: string
  repo: string
  command: string
  commandType: CommandType
  queuedAt: string
}

export interface PipelineStep {
  label: string
  state: StepState
}

export interface Pipeline {
  repo: string
  steps: PipelineStep[]
}

export interface ExecutionHistoryItem {
  id: number
  name: string
  repo: string
  status: CommandStatus
  duration: string
  timestamp: string
}

export interface HistoryStats {
  totalRuns: number
  successRate: string
  avgDuration: string
}

export interface ExtendedStats {
  totalRuns: number
  successRate: string
  failureRate: string
  avgDuration: string
  totalDuration: string
  fastestRun: string
  slowestRun: string
  commandsInQueue: number
  activeRepositories: number
  totalCommands: number
  runningCommands: number
}

export interface StatCard {
  label: string
  value: string
  icon?: ElementType
  note?: string
}

export interface DashboardState {
  repositories: Repository[]
  commands: Command[]
  liveExecutions: LiveExecution[]
  runQueue: RunQueueItem[]
  pipelines: Pipeline[]
  executionHistory: ExecutionHistoryItem[]
  historyStats: HistoryStats
}

export interface RunCommandInput {
  repo: string
  name?: string
  command: string
  commandType?: CommandType
}

export interface StopCommandInput {
  repo: string
  command: string
}
