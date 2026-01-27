import { BarChart3, CheckCircle2, Timer } from "lucide-react"
import { StatsCards } from "./stats-cards"
import { HistoryList } from "./history-list"
import { RunDetailsPanel } from "./run-details-panel"
import type { ExecutionHistoryItem, HistoryStats, Repository, StatCard } from "./types"
import { selectedRunLogs } from "@/lib/command-hub/mock-data"

interface HistoryTabProps {
  selectedRepo: string | null
  executionHistory: ExecutionHistoryItem[]
  historyStats: HistoryStats
  repositories: Repository[]
}

export function HistoryTab({
  selectedRepo,
  executionHistory,
  historyStats,
  repositories,
}: HistoryTabProps) {
  const statsCards: StatCard[] = [
    {
      label: "Total runs",
      value: String(historyStats.totalRuns),
      icon: BarChart3,
    },
    {
      label: "Success rate",
      value: historyStats.successRate,
      icon: CheckCircle2,
    },
    {
      label: "Avg duration",
      value: historyStats.avgDuration,
      icon: Timer,
    },
  ]

  // Use first failed run for demo, or first run if none failed
  const selectedRun =
    executionHistory.find((r) => r.status === "failed") ||
    executionHistory[0] ||
    null

  return (
    <div className="flex flex-col gap-4">
      {/* Stats cards */}
      <StatsCards stats={statsCards} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Past executions */}
        <HistoryList
          history={executionHistory}
          selectedRepo={selectedRepo}
          repositories={repositories}
        />

        {/* Run details panel */}
        {selectedRun && (
          <RunDetailsPanel run={selectedRun} logs={selectedRunLogs} />
        )}
      </div>
    </div>
  )
}
