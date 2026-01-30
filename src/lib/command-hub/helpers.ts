import type {
  Command,
  DashboardState,
  ExecutionHistoryItem,
  ExtendedStats,
  HistoryStats,
  Repository,
} from "@/components/repos/types"

export function repoStatusColor(status: string): string {
  if (status === "active") return "text-chart-1"
  if (status === "warn") return "text-chart-4"
  return "text-muted-foreground/70"
}

export function filterByRepo<T extends { repo: string }>(
  items: T[],
  selectedRepo: string | null
): T[] {
  if (!selectedRepo) return items
  return items.filter((i) => i.repo === selectedRepo)
}

export function groupByRepo<T extends { repo: string }>(
  items: T[]
): Record<string, T[]> {
  const map: Record<string, T[]> = {}
  for (const item of items) {
    ;(map[item.repo] ??= []).push(item)
  }
  return map
}

export function getRepo(
  name: string,
  repositories: Repository[]
): Repository | undefined {
  return repositories.find((r) => r.name === name)
}

export function computeStats(
  items: ExecutionHistoryItem[]
): HistoryStats {
  if (items.length === 0)
    return { totalRuns: 0, successRate: "–", avgDuration: "–" }
  const successes = items.filter((i) => i.status === "success").length
  const rate = Math.round((successes / items.length) * 100)
  // avg duration: parse mm:ss → seconds → avg → format back
  const totalSec = items.reduce((acc, i) => {
    const [m, s] = i.duration.split(":").map(Number)
    return acc + m * 60 + s
  }, 0)
  const avgSec = Math.round(totalSec / items.length)
  const mm = String(Math.floor(avgSec / 60)).padStart(2, "0")
  const ss = String(avgSec % 60).padStart(2, "0")
  return {
    totalRuns: items.length,
    successRate: `${rate}%`,
    avgDuration: `${mm}:${ss}`,
  }
}

export function runningCount(
  repoName: string,
  commands: Command[]
): number {
  return commands.filter((c) => c.repo === repoName && c.status === "running")
    .length
}

function parseDuration(duration: string): number {
  if (duration === "-" || !duration) return 0
  const [m, s] = duration.split(":").map(Number)
  return m * 60 + s
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return "00:00"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export function computeExtendedStats(
  state: DashboardState
): ExtendedStats {
  const {
    executionHistory,
    commands,
    repositories,
    runQueue,
    liveExecutions,
  } = state

  // Basic stats from history
  const totalRuns = executionHistory.length
  const successes = executionHistory.filter((i) => i.status === "success").length
  const failures = executionHistory.filter((i) => i.status === "failed").length
  const successRate =
    totalRuns > 0 ? `${Math.round((successes / totalRuns) * 100)}%` : "0%"
  const failureRate =
    totalRuns > 0 ? `${Math.round((failures / totalRuns) * 100)}%` : "0%"

  // Duration calculations
  const durations = executionHistory
    .map((i) => parseDuration(i.duration))
    .filter((d) => d > 0)

  let avgDuration = "–"
  let totalDuration = "–"
  let fastestRun = "–"
  let slowestRun = "–"

  if (durations.length > 0) {
    const totalSec = durations.reduce((acc, d) => acc + d, 0)
    const avgSec = Math.round(totalSec / durations.length)
    avgDuration = formatDuration(avgSec)
    totalDuration = formatDuration(totalSec)

    const fastestSec = Math.min(...durations)
    const slowestSec = Math.max(...durations)
    fastestRun = formatDuration(fastestSec)
    slowestRun = formatDuration(slowestSec)
  }

  // Command and repository stats
  const commandsInQueue = runQueue.length
  const activeRepositories = repositories.filter((r) => r.status === "active")
    .length
  const totalCommands = commands.length
  const runningCommands = liveExecutions.length

  return {
    totalRuns,
    successRate,
    failureRate,
    avgDuration,
    totalDuration,
    fastestRun,
    slowestRun,
    commandsInQueue,
    activeRepositories,
    totalCommands,
    runningCommands,
  }
}
