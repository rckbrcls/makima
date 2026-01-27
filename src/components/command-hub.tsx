import { useState, type ElementType } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  FileText,
  FolderGit2,
  GitBranch,
  Hammer,
  History,
  Layers,
  Menu,
  Package,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
  Terminal,
  Timer,
  XCircle,
  Zap,
} from "lucide-react"

// ── Mock data ──────────────────────────────────────────────────────────

const repositories = [
  {
    name: "commander",
    path: "~/codes/commander",
    branch: "main",
    status: "active",
    tech: ["tauri", "react", "vite"],
    lastRun: "now",
    running: "dev: tauri",
  },
  {
    name: "billing-api",
    path: "~/codes/billing-api",
    branch: "release/2026.01",
    status: "idle",
    tech: ["node", "prisma"],
    lastRun: "20 min",
    running: "-",
  },
  {
    name: "ui-kit",
    path: "~/codes/ui-kit",
    branch: "design-refresh",
    status: "warn",
    tech: ["storybook", "ts"],
    lastRun: "yesterday",
    running: "tests",
  },
]

const commands = [
  { name: "Dev (Tauri)", command: "pnpm tauri dev", type: "run", status: "running", duration: "02:14", lastRun: "now", repo: "commander" },
  { name: "Build Desktop", command: "pnpm tauri build", type: "build", status: "idle", duration: "-", lastRun: "3h", repo: "commander" },
  { name: "Tests", command: "pnpm test", type: "test", status: "queued", duration: "-", lastRun: "yesterday", repo: "commander" },
  { name: "Lint", command: "pnpm lint", type: "lint", status: "success", duration: "00:42", lastRun: "30 min", repo: "commander" },
  { name: "Typecheck", command: "pnpm tsc --noEmit", type: "check", status: "failed", duration: "01:12", lastRun: "2h", repo: "commander" },
  { name: "Bundle Assets", command: "pnpm build:assets", type: "bundle", status: "idle", duration: "-", lastRun: "never", repo: "commander" },
  { name: "Dev Server", command: "pnpm dev", type: "run", status: "idle", duration: "-", lastRun: "20 min", repo: "billing-api" },
  { name: "Tests", command: "pnpm test", type: "test", status: "success", duration: "01:45", lastRun: "1h", repo: "billing-api" },
  { name: "Migrate DB", command: "pnpm prisma migrate dev", type: "build", status: "idle", duration: "-", lastRun: "2d", repo: "billing-api" },
  { name: "Seed", command: "pnpm prisma db seed", type: "run", status: "idle", duration: "-", lastRun: "2d", repo: "billing-api" },
  { name: "Storybook", command: "pnpm storybook", type: "run", status: "running", duration: "05:30", lastRun: "now", repo: "ui-kit" },
  { name: "Tests", command: "pnpm test", type: "test", status: "failed", duration: "00:58", lastRun: "1h", repo: "ui-kit" },
  { name: "Build", command: "pnpm build", type: "build", status: "idle", duration: "-", lastRun: "yesterday", repo: "ui-kit" },
]

const liveExecutions = [
  {
    repo: "commander",
    command: "Dev (Tauri)",
    pid: 42301,
    cpu: "38%",
    ram: "1.2 GB",
    logs: [
      "[14:32:10] bundler ready",
      "[14:32:12] starting tauri dev",
      "[14:32:18] watching src/**/*",
      "[14:32:23] cache warmed in 4.1s",
    ],
  },
  {
    repo: "billing-api",
    command: "Tests",
    pid: 42405,
    cpu: "12%",
    ram: "340 MB",
    logs: [
      "[14:33:01] collecting tests…",
      "[14:33:04] running 48 tests",
      "[14:33:12] 32/48 passed",
    ],
  },
  {
    repo: "ui-kit",
    command: "Storybook",
    pid: 42510,
    cpu: "22%",
    ram: "680 MB",
    logs: [
      "[14:31:50] storybook starting",
      "[14:31:55] loaded 24 stories",
      "[14:31:58] serving on :6006",
    ],
  },
]

const runQueue = [
  { name: "Build Desktop", repo: "commander", eta: "~3 min" },
  { name: "Tests", repo: "billing-api", eta: "~8 min" },
  { name: "Storybook", repo: "ui-kit", eta: "~5 min" },
]

const pipelines = [
  {
    repo: "commander",
    steps: [
      { label: "Install deps", state: "done" },
      { label: "Setup env", state: "done" },
      { label: "Compile frontend", state: "running" },
      { label: "Package desktop", state: "pending" },
    ],
  },
  {
    repo: "billing-api",
    steps: [
      { label: "Install deps", state: "done" },
      { label: "Run migrations", state: "done" },
      { label: "Run tests", state: "running" },
      { label: "Deploy staging", state: "pending" },
    ],
  },
  {
    repo: "ui-kit",
    steps: [
      { label: "Install deps", state: "done" },
      { label: "Build tokens", state: "done" },
      { label: "Build components", state: "pending" },
      { label: "Publish", state: "pending" },
    ],
  },
]

const executionHistory = [
  { id: 1, name: "Build Desktop", repo: "commander", status: "success", duration: "03:22", timestamp: "Today 14:12" },
  { id: 2, name: "Tests", repo: "billing-api", status: "success", duration: "01:45", timestamp: "Today 13:50" },
  { id: 3, name: "Lint", repo: "commander", status: "success", duration: "00:38", timestamp: "Today 13:30" },
  { id: 4, name: "Deploy Staging", repo: "billing-api", status: "failed", duration: "02:11", timestamp: "Today 12:05" },
  { id: 5, name: "Typecheck", repo: "ui-kit", status: "success", duration: "01:02", timestamp: "Today 11:40" },
  { id: 6, name: "Storybook Build", repo: "ui-kit", status: "success", duration: "01:55", timestamp: "Yesterday 18:20" },
  { id: 7, name: "Tests", repo: "commander", status: "failed", duration: "01:12", timestamp: "Yesterday 17:45" },
  { id: 8, name: "Build Desktop", repo: "commander", status: "success", duration: "03:18", timestamp: "Yesterday 16:30" },
]

const historyStats = {
  totalRuns: 18,
  successRate: "94%",
  avgDuration: "01:48",
}

const selectedRunLogs = [
  "[12:05:01] Starting deploy to staging…",
  "[12:05:03] Pulling latest from release/2026.01",
  "[12:05:08] Installing dependencies…",
  "[12:05:22] Dependencies installed",
  "[12:05:24] Running pre-deploy checks…",
  "[12:05:30] Typecheck passed",
  "[12:05:32] Lint passed",
  "[12:05:35] Running test suite…",
  "[12:06:48] 3 tests failed: auth.spec.ts",
  "[12:06:50] Deploy aborted — Tests failed",
  "[12:06:50] Exit code 1",
]

const statusStyles: Record<string, string> = {
  running: "border-chart-2/50 bg-chart-2/15 text-chart-2",
  queued: "border-chart-4/50 bg-chart-4/15 text-chart-4",
  success: "border-chart-1/50 bg-chart-1/15 text-chart-1",
  failed: "border-destructive/40 bg-destructive/15 text-destructive",
  idle: "border-border bg-muted/60 text-muted-foreground",
}

const typeIcons: Record<string, ElementType> = {
  run: Play,
  build: Hammer,
  test: Activity,
  lint: Zap,
  check: AlertTriangle,
  bundle: Package,
}

// ── Helpers ────────────────────────────────────────────────────────────

function repoStatusColor(status: string) {
  if (status === "active") return "text-chart-1"
  if (status === "warn") return "text-chart-4"
  return "text-muted-foreground/70"
}

function filterByRepo<T extends { repo: string }>(items: T[], selectedRepo: string | null): T[] {
  if (!selectedRepo) return items
  return items.filter((i) => i.repo === selectedRepo)
}

function groupByRepo<T extends { repo: string }>(items: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {}
  for (const item of items) {
    ;(map[item.repo] ??= []).push(item)
  }
  return map
}

function getRepo(name: string) {
  return repositories.find((r) => r.name === name)
}

function computeStats(items: typeof executionHistory) {
  if (items.length === 0) return { totalRuns: 0, successRate: "–", avgDuration: "–" }
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
  return { totalRuns: items.length, successRate: `${rate}%`, avgDuration: `${mm}:${ss}` }
}

function runningCount(repoName: string) {
  return commands.filter((c) => c.repo === repoName && c.status === "running").length
}

// ── Component ──────────────────────────────────────────────────────────

export function CommandHub() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // ── Sidebar (reused in desktop aside + mobile Sheet) ──
  function renderSidebar() {
    return (
      <Card className="flex flex-col border-border/60 bg-card/85 shadow-[0_14px_24px_var(--shadow-color)]">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FolderGit2 className="size-4 text-primary" />
            Repositories
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-1 overflow-y-auto">
          {/* All repositories */}
          <button
            onClick={() => { setSelectedRepo(null); setMobileOpen(false) }}
            className={cn(
              "flex w-full items-center justify-between rounded-none border px-3 py-2 text-left transition",
              selectedRepo === null
                ? "border-primary/40 bg-primary/10"
                : "border-transparent hover:bg-accent/60"
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Layers className="size-3.5 text-primary" />
              All repositories
            </span>
            <Badge variant="outline" className="text-[0.6rem]">
              {repositories.length}
            </Badge>
          </button>

          <Separator className="my-2 bg-border/60" />

          {/* Repo list */}
          {repositories.map((repo) => {
            const running = runningCount(repo.name)
            return (
              <button
                key={repo.name}
                onClick={() => { setSelectedRepo(repo.name); setMobileOpen(false) }}
                className={cn(
                  "flex w-full items-center justify-between rounded-none border px-3 py-2 text-left transition",
                  selectedRepo === repo.name
                    ? "border-primary/40 bg-primary/10"
                    : "border-transparent hover:bg-accent/60"
                )}
              >
                <span className="flex items-center gap-2">
                  <CircleDot className={cn("size-3", repoStatusColor(repo.status))} />
                  <span className="space-y-0.5">
                    <span className="block text-xs font-medium text-foreground">{repo.name}</span>
                    <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                      <GitBranch className="size-2.5" />
                      {repo.branch}
                    </span>
                  </span>
                </span>
                {running > 0 && (
                  <Badge variant="outline" className="border-chart-2/50 bg-chart-2/15 text-[0.55rem] text-chart-2">
                    {running}
                  </Badge>
                )}
              </button>
            )
          })}
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full border-border bg-card/70 text-xs">
            <Plus data-icon="inline-start" />
            Add repository
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // ── Filtered / grouped data ──
  const filteredCommands = filterByRepo(commands, selectedRepo)
  const filteredHistory = filterByRepo(executionHistory, selectedRepo)
  const filteredQueue = filterByRepo(runQueue, selectedRepo)
  const filteredLive = filterByRepo(liveExecutions, selectedRepo)
  const filteredPipelines = selectedRepo
    ? pipelines.filter((p) => p.repo === selectedRepo)
    : pipelines

  const groupedCommands = groupByRepo(filteredCommands)
  const groupedHistory = groupByRepo(filteredHistory)

  const statsForTab = selectedRepo ? computeStats(filteredHistory) : historyStats

  // ── Render ──
  return (
    <div className="relative h-svh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,var(--glow-1),transparent_45%),radial-gradient(circle_at_82%_8%,var(--glow-2),transparent_42%),radial-gradient(circle_at_72%_78%,var(--glow-3),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-20 bottom-12 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-[float_14s_ease-in-out_infinite]" />

      <div className="relative mx-auto grid h-full w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Mobile menu trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <div className="flex size-12 items-center justify-center border border-border/70 bg-card/70 shadow-[0_8px_20px_var(--shadow-color)]">
                <Terminal className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
                  Command panel
                </p>
                <h1 className="text-2xl font-semibold">Commander</h1>
                <p className="text-xs text-muted-foreground">
                  Orchestrate build, run and deploy per repository in one place.
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 min-[480px]:flex-nowrap">
              <div className="relative w-full min-w-[220px] max-w-sm">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search commands, repos or tags"
                  className="h-9 border-border bg-background/80 pl-8 text-xs shadow-sm"
                />
              </div>
              <ModeToggle />
              <Button variant="outline" className="h-9 border-border bg-card/70 text-xs">
                <Sparkles data-icon="inline-start" />
                Auto-setup
              </Button>
              <Button className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus data-icon="inline-start" />
                New repo
              </Button>
            </div>
          </div>
        </header>

        {/* ── Body: sidebar + main ── */}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="hidden min-h-0 lg:flex lg:flex-col lg:sticky lg:top-4 lg:self-start">
            {renderSidebar()}
          </aside>

          {/* Mobile sidebar (Sheet) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Repositories</SheetTitle>
                <SheetDescription>Select a repository to filter commands.</SheetDescription>
              </SheetHeader>
              {renderSidebar()}
            </SheetContent>
          </Sheet>

          {/* ── Main area with tabs ── */}
          <Tabs defaultValue="commands" className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
            <TabsList className="mb-4 self-start border border-border/60 bg-card/80 shadow-[0_8px_16px_var(--shadow-color)]">
              <TabsTrigger value="commands">Commands</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* ── Tab: Commands ── */}
            <TabsContent value="commands" className="flex flex-col">
              <div className="flex flex-col gap-4">
                {selectedRepo === null ? (
                  /* ── All repos: grouped by repo ── */
                  <div className="flex flex-col gap-4">
                    {Object.entries(groupedCommands).map(([repoName, cmds]) => {
                      const repo = getRepo(repoName)
                      return (
                        <section key={repoName}>
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <CircleDot className={cn("size-3", repoStatusColor(repo?.status ?? "idle"))} />
                              {repoName}
                              <span className="flex items-center gap-1 text-[0.6rem] font-normal text-muted-foreground">
                                <GitBranch className="size-2.5" />
                                {repo?.branch}
                              </span>
                            </h3>
                            <Button variant="outline" size="sm" className="border-border bg-card/80">
                              <Square data-icon="inline-start" />
                              Stop all
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {cmds.map((command, index) => {
                              const Icon = typeIcons[command.type]
                              return (
                                <Card
                                  key={`${repoName}-${command.name}`}
                                  size="sm"
                                  className={cn(
                                    "border-border/70 bg-card/80 shadow-[0_10px_20px_var(--shadow-color)] animate-in fade-in slide-in-from-bottom-8 duration-700",
                                    index % 2 === 0 ? "delay-200" : "delay-300"
                                  )}
                                >
                                  <CardHeader className="border-b border-border/60">
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                      <span className="flex size-7 items-center justify-center border border-border bg-muted text-foreground/80">
                                        <Icon className="size-4" />
                                      </span>
                                      {command.name}
                                    </CardTitle>
                                    <CardAction>
                                      <Badge
                                        variant="outline"
                                        className={cn("text-[0.6rem] uppercase", statusStyles[command.status])}
                                      >
                                        {command.status}
                                      </Badge>
                                    </CardAction>
                                    <CardDescription className="text-[0.7rem] text-muted-foreground">
                                      {command.command}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                                      <span>last run: {command.lastRun}</span>
                                      <span className="text-foreground/80">time: {command.duration}</span>
                                    </div>
                                    <div className="h-1 w-full overflow-hidden border border-border bg-muted">
                                      <div
                                        className={cn(
                                          "h-full",
                                          command.status === "running"
                                            ? "w-3/4 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.8s_linear_infinite]"
                                            : command.status === "queued"
                                            ? "w-1/3 bg-chart-4/80"
                                            : command.status === "failed"
                                            ? "w-full bg-destructive/70"
                                            : command.status === "success"
                                            ? "w-full bg-chart-1/70"
                                            : "w-0"
                                        )}
                                      />
                                    </div>
                                  </CardContent>
                                  <CardFooter className="justify-between">
                                    <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                                      <Clock className="size-3" />
                                      scheduled at 14:30
                                    </div>
                                    <Button size="xs" className="h-6 bg-primary text-primary-foreground hover:bg-primary/90">
                                      <Play data-icon="inline-start" />
                                      Run
                                    </Button>
                                  </CardFooter>
                                </Card>
                              )
                            })}
                          </div>
                          <Separator className="mt-4 bg-border/60" />
                        </section>
                      )
                    })}
                  </div>
                ) : (
                  /* ── Single repo: summary + grid + Quick Composer ── */
                  <div className="flex flex-col gap-4">
                    {/* Summary cards */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { label: "Total commands", value: String(filteredCommands.length), note: `in ${selectedRepo}` },
                        { label: "Running", value: String(filteredCommands.filter((c) => c.status === "running").length), note: "active now" },
                        { label: "Last passed", value: String(filteredCommands.filter((c) => c.status === "success").length), note: "succeeded" },
                      ].map((item, index) => (
                        <Card
                          key={item.label}
                          className={cn(
                            "border-border/70 bg-card/80 shadow-[0_12px_32px_var(--shadow-color)] backdrop-blur animate-in fade-in slide-in-from-bottom-6 duration-700",
                            index === 0 && "delay-100",
                            index === 1 && "delay-200",
                            index === 2 && "delay-300"
                          )}
                        >
                          <CardHeader className="border-b border-border/60">
                            <CardDescription className="uppercase tracking-[0.3em] text-[0.55rem] text-muted-foreground">
                              {item.label}
                            </CardDescription>
                            <CardTitle className="text-2xl text-foreground">{item.value}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex items-center justify-between text-[0.7rem] text-muted-foreground">
                            <span>{item.note}</span>
                            <ChevronRight className="size-4 text-muted-foreground/70" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Commands grid */}
                    <Card className="flex flex-col border-border/60 bg-card/85 shadow-[0_18px_40px_var(--shadow-color)]">
                      <CardHeader className="border-b border-border/60">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Terminal className="size-4 text-primary" />
                          {selectedRepo} | commands
                        </CardTitle>
                        <CardDescription>
                          Every command runs in background with live feedback.
                        </CardDescription>
                        <CardAction>
                          <Button variant="outline" size="sm" className="border-border bg-card/80">
                            <Square data-icon="inline-start" />
                            Stop all
                          </Button>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2">
                        {filteredCommands.map((command, index) => {
                          const Icon = typeIcons[command.type]
                          return (
                            <Card
                              key={`${command.repo}-${command.name}`}
                              size="sm"
                              className={cn(
                                "border-border/70 bg-card/80 shadow-[0_10px_20px_var(--shadow-color)] animate-in fade-in slide-in-from-bottom-8 duration-700",
                                index % 2 === 0 ? "delay-200" : "delay-300"
                              )}
                            >
                              <CardHeader className="border-b border-border/60">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                  <span className="flex size-7 items-center justify-center border border-border bg-muted text-foreground/80">
                                    <Icon className="size-4" />
                                  </span>
                                  {command.name}
                                </CardTitle>
                                <CardAction>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[0.6rem] uppercase", statusStyles[command.status])}
                                  >
                                    {command.status}
                                  </Badge>
                                </CardAction>
                                <CardDescription className="text-[0.7rem] text-muted-foreground">
                                  {command.command}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                                  <span>last run: {command.lastRun}</span>
                                  <span className="text-foreground/80">time: {command.duration}</span>
                                </div>
                                <div className="h-1 w-full overflow-hidden border border-border bg-muted">
                                  <div
                                    className={cn(
                                      "h-full",
                                      command.status === "running"
                                        ? "w-3/4 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.8s_linear_infinite]"
                                        : command.status === "queued"
                                        ? "w-1/3 bg-chart-4/80"
                                        : command.status === "failed"
                                        ? "w-full bg-destructive/70"
                                        : command.status === "success"
                                        ? "w-full bg-chart-1/70"
                                        : "w-0"
                                    )}
                                  />
                                </div>
                              </CardContent>
                              <CardFooter className="justify-between">
                                <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                                  <Clock className="size-3" />
                                  scheduled at 14:30
                                </div>
                                <Button size="xs" className="h-6 bg-primary text-primary-foreground hover:bg-primary/90">
                                  <Play data-icon="inline-start" />
                                  Run
                                </Button>
                              </CardFooter>
                            </Card>
                          )
                        })}
                      </CardContent>
                    </Card>

                    {/* Quick Composer */}
                    <Card className="shrink-0 border-border/60 bg-card/85 shadow-[0_18px_36px_var(--shadow-color)]">
                      <CardHeader className="border-b border-border/60">
                        <CardTitle className="text-sm">Quick composer</CardTitle>
                        <CardDescription>Build custom commands for {selectedRepo}.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid min-h-0 gap-3 sm:grid-cols-[1.2fr_1fr]">
                        <div className="space-y-2">
                          <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                            base command
                          </label>
                          <Input
                            className="h-9 border-border bg-background/80 text-xs"
                            defaultValue="pnpm run"
                          />
                          <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                            arguments
                          </label>
                          <Input
                            className="h-9 border-border bg-background/80 text-xs"
                            placeholder="build --filter=desktop"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="border-border bg-card/70">
                              <Play data-icon="inline-start" />
                              Run now
                            </Button>
                            <Button variant="outline" size="sm" className="border-border bg-card/70">
                              <Plus data-icon="inline-start" />
                              Save command
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                            notes and variables
                          </label>
                          <Textarea
                            className="min-h-[124px] border-border bg-background/80 text-xs"
                            placeholder="ENV=production\nCACHE=false\n"
                          />
                          <div className="rounded-none border border-border/70 bg-accent/60 p-3 text-[0.65rem] text-muted-foreground">
                            Tip: use {"{{repo}}"} and {"{{branch}}"} to inject context in real-time.
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Tab: Execution ── */}
            <TabsContent value="execution" className="flex flex-col">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                {/* Live execution cards */}
                <div className="flex flex-col gap-4">
                  {filteredLive.map((exec) => (
                    <Card
                      key={exec.repo}
                      className="flex flex-col border-border/70 bg-card/85 shadow-[0_18px_36px_var(--shadow-color)]"
                    >
                      <CardHeader className="border-b border-border/60">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Activity className="size-4 text-primary" />
                          Live execution
                        </CardTitle>
                        <CardAction>
                          <Badge
                            variant="outline"
                            className="border-chart-2/50 bg-chart-2/15 text-[0.6rem] uppercase text-chart-2"
                          >
                            running
                          </Badge>
                        </CardAction>
                        <CardDescription>
                          {exec.repo} | {exec.command}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                          <span>PID {exec.pid}</span>
                          <span>CPU {exec.cpu} | RAM {exec.ram}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden border border-border bg-muted">
                          <div className="h-full w-2/3 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.6s_linear_infinite]" />
                        </div>
                        <div className="space-y-1 rounded-none border border-border bg-muted/80 p-3 text-[0.65rem] text-foreground">
                          {exec.logs.map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="justify-between">
                        <Button variant="outline" size="sm" className="border-border bg-card/70">
                          <Square data-icon="inline-start" />
                          Terminate
                        </Button>
                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Terminal data-icon="inline-start" />
                          Open log
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {/* Right column: queue + build steps */}
                <div className="flex flex-col gap-4">
                  <Card className="flex flex-col border-border/60 bg-card/85 shadow-[0_18px_36px_var(--shadow-color)]">
                    <CardHeader className="border-b border-border/60">
                      <CardTitle className="text-sm">Execution queue</CardTitle>
                      <CardDescription>What comes next in the pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredQueue.map((item) => (
                        <div key={`${item.repo}-${item.name}`} className="space-y-1 border border-border bg-card/70 p-3">
                          <div className="flex items-center justify-between text-xs font-medium text-foreground">
                            <span>{item.name}</span>
                            <span className="text-[0.65rem] text-muted-foreground">{item.eta}</span>
                          </div>
                          <div className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                            {item.repo}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="shrink-0 border-border/60 bg-card/85 shadow-[0_16px_28px_var(--shadow-color)]">
                    <CardHeader className="border-b border-border/60">
                      <CardTitle className="text-sm">Build steps</CardTitle>
                      <CardDescription>Progress visualization per step.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredPipelines.map((p) => (
                        <div key={p.repo} className="space-y-3">
                          {selectedRepo === null && (
                            <div className="flex items-center gap-2 text-[0.65rem] font-medium text-foreground">
                              <CircleDot className={cn("size-2.5", repoStatusColor(getRepo(p.repo)?.status ?? "idle"))} />
                              {p.repo}
                            </div>
                          )}
                          {p.steps.map((step) => (
                            <div key={`${p.repo}-${step.label}`} className="flex items-center justify-between text-xs">
                              <span className="text-foreground/80">{step.label}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[0.6rem] uppercase",
                                  step.state === "done" && "border-chart-1/50 bg-chart-1/15 text-chart-1",
                                  step.state === "running" && "border-chart-4/50 bg-chart-4/15 text-chart-4",
                                  step.state === "pending" && "border-border bg-card text-muted-foreground"
                                )}
                              >
                                {step.state}
                              </Badge>
                            </div>
                          ))}
                          {selectedRepo === null && <Separator className="bg-border/60" />}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                        <CircleDot className="size-3 text-chart-4" />
                        Estimated build at 14:41
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ── Tab: History ── */}
            <TabsContent value="history" className="flex flex-col">
              <div className="flex flex-col gap-4">
                {/* Stats cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Total runs", value: String(statsForTab.totalRuns), icon: BarChart3 },
                    { label: "Success rate", value: statsForTab.successRate, icon: CheckCircle2 },
                    { label: "Avg duration", value: statsForTab.avgDuration, icon: Timer },
                  ].map((item, index) => {
                    const Icon = item.icon
                    return (
                      <Card
                        key={item.label}
                        className={cn(
                          "border-border/70 bg-card/80 shadow-[0_12px_32px_var(--shadow-color)] backdrop-blur animate-in fade-in slide-in-from-bottom-6 duration-700",
                          index === 0 && "delay-100",
                          index === 1 && "delay-200",
                          index === 2 && "delay-300"
                        )}
                      >
                        <CardHeader className="border-b border-border/60">
                          <CardDescription className="uppercase tracking-[0.3em] text-[0.55rem] text-muted-foreground">
                            {item.label}
                          </CardDescription>
                          <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
                            <Icon className="size-5 text-primary" />
                            {item.value}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    )
                  })}
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
                  {/* Past executions */}
                  <Card className="flex flex-col border-border/60 bg-card/85 shadow-[0_16px_30px_var(--shadow-color)]">
                    <CardHeader className="border-b border-border/60">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <History className="size-4 text-primary" />
                        Past executions
                      </CardTitle>
                      <CardDescription>Browse previous runs and their results.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedRepo === null ? (
                        /* Grouped by repo */
                        Object.entries(groupedHistory).map(([repoName, runs]) => (
                          <div key={repoName}>
                            <div className="mb-2 flex items-center gap-2 text-[0.65rem] font-medium text-foreground">
                              <CircleDot className={cn("size-2.5", repoStatusColor(getRepo(repoName)?.status ?? "idle"))} />
                              {repoName}
                            </div>
                            {runs.map((run) => (
                              <div
                                key={run.id}
                                className="mb-1 flex items-center justify-between border border-border/60 bg-card/70 px-3 py-2.5 transition hover:border-primary/40"
                              >
                                <div className="flex items-center gap-3">
                                  {run.status === "success" ? (
                                    <CheckCircle2 className="size-4 text-chart-1" />
                                  ) : (
                                    <XCircle className="size-4 text-destructive" />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{run.name}</p>
                                    <p className="text-[0.65rem] text-muted-foreground">{run.repo}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[0.65rem] text-muted-foreground">{run.duration}</span>
                                  <span className="text-[0.6rem] text-muted-foreground/70">{run.timestamp}</span>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[0.6rem] uppercase", statusStyles[run.status])}
                                  >
                                    {run.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            <Separator className="my-2 bg-border/60" />
                          </div>
                        ))
                      ) : (
                        /* Flat filtered list */
                        filteredHistory.map((run) => (
                          <div
                            key={run.id}
                            className="flex items-center justify-between border border-border/60 bg-card/70 px-3 py-2.5 transition hover:border-primary/40"
                          >
                            <div className="flex items-center gap-3">
                              {run.status === "success" ? (
                                <CheckCircle2 className="size-4 text-chart-1" />
                              ) : (
                                <XCircle className="size-4 text-destructive" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground">{run.name}</p>
                                <p className="text-[0.65rem] text-muted-foreground">{run.repo}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[0.65rem] text-muted-foreground">{run.duration}</span>
                              <span className="text-[0.6rem] text-muted-foreground/70">{run.timestamp}</span>
                              <Badge
                                variant="outline"
                                className={cn("text-[0.6rem] uppercase", statusStyles[run.status])}
                              >
                                {run.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Run details panel */}
                  <Card className="flex flex-col border-border/60 bg-card/85 shadow-[0_18px_36px_var(--shadow-color)]">
                    <CardHeader className="border-b border-border/60">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-primary" />
                        Run details
                      </CardTitle>
                      <CardDescription>Deploy Staging — billing-api</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                        <span>Exit code: 1</span>
                        <span>Duration: 02:11</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden border border-border bg-muted">
                        <div className="h-full w-full bg-destructive/70" />
                      </div>
                      <div className="space-y-1 rounded-none border border-border bg-muted/80 p-3 text-[0.65rem] text-foreground">
                        {selectedRunLogs.map((line, i) => (
                          <div
                            key={i}
                            className={cn(
                              line.includes("failed") || line.includes("aborted")
                                ? "text-destructive"
                                : line.includes("passed")
                                ? "text-chart-1"
                                : ""
                            )}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="justify-between">
                      <Button variant="outline" size="sm" className="border-border bg-card/70">
                        <FileText data-icon="inline-start" />
                        Full log
                      </Button>
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Play data-icon="inline-start" />
                        Re-run
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
