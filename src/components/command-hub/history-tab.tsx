import {
  Activity,
  BarChart3,
  CheckCircle2,
  Command,
  Gauge,
  Hourglass,
  List,
  PlayCircle,
  Timer,
  XCircle,
  Zap,
} from "lucide-react"
import { computeExtendedStats, filterByRepo } from "@/lib/command-hub/helpers"
import { StatsCards } from "./stats-cards"
import type { DashboardState, StatCard } from "./types"

interface HistoryTabProps {
  state: DashboardState
  selectedRepo: string | null
}

export function HistoryTab({ state, selectedRepo }: HistoryTabProps) {
  // Filter state if a repo is selected
  const filteredState: DashboardState = selectedRepo
    ? {
        ...state,
        executionHistory: filterByRepo(state.executionHistory, selectedRepo),
        commands: filterByRepo(state.commands, selectedRepo),
        repositories: state.repositories.filter((r) => r.name === selectedRepo),
        runQueue: filterByRepo(state.runQueue, selectedRepo),
        liveExecutions: filterByRepo(state.liveExecutions, selectedRepo),
      }
    : state

  const extendedStats = computeExtendedStats(filteredState)

  const statsCards: StatCard[] = [
    {
      label: "Total runs",
      value: String(extendedStats.totalRuns),
      icon: BarChart3,
      note: "executions",
    },
    {
      label: "Success rate",
      value: extendedStats.successRate,
      icon: CheckCircle2,
      note: "passed",
    },
    {
      label: "Failure rate",
      value: extendedStats.failureRate,
      icon: XCircle,
      note: "failed",
    },
    {
      label: "Avg duration",
      value: extendedStats.avgDuration,
      icon: Timer,
      note: "per run",
    },
    {
      label: "Total duration",
      value: extendedStats.totalDuration,
      icon: Hourglass,
      note: "all runs",
    },
    {
      label: "Fastest run",
      value: extendedStats.fastestRun,
      icon: Zap,
      note: "best time",
    },
    {
      label: "Slowest run",
      value: extendedStats.slowestRun,
      icon: Gauge,
      note: "longest time",
    },
    {
      label: "In queue",
      value: String(extendedStats.commandsInQueue),
      icon: List,
      note: "waiting",
    },
    {
      label: "Active repos",
      value: String(extendedStats.activeRepositories),
      icon: Activity,
      note: "repositories",
    },
    {
      label: "Total commands",
      value: String(extendedStats.totalCommands),
      icon: Command,
      note: "configured",
    },
    {
      label: "Running",
      value: String(extendedStats.runningCommands),
      icon: PlayCircle,
      note: "active now",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Stats cards */}
      <StatsCards stats={statsCards} />
    </div>
  )
}
