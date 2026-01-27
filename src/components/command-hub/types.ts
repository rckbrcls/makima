import type { ElementType } from "react"

export type RepositoryStatus = "active" | "idle" | "warn"
export type CommandStatus = "running" | "queued" | "success" | "failed" | "idle"
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
  logs: string[]
}

export interface RunQueueItem {
  name: string
  repo: string
  eta: string
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
  status: "success" | "failed"
  duration: string
  timestamp: string
}

export interface HistoryStats {
  totalRuns: number
  successRate: string
  avgDuration: string
}

export interface StatCard {
  label: string
  value: string
  icon?: ElementType
  note?: string
}
