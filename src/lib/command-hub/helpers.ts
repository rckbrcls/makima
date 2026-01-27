import type {
  Command,
  ExecutionHistoryItem,
  HistoryStats,
  Repository,
} from "@/components/command-hub/types"

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
