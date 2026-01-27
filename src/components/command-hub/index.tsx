import { useState } from "react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { filterByRepo, runningCount } from "@/lib/command-hub/helpers"
import {
  commands,
  executionHistory,
  historyStats,
  liveExecutions,
  pipelines,
  repositories,
  runQueue,
} from "@/lib/command-hub/mock-data"
import { CommandHubHeader } from "./command-hub-header"
import { RepositorySidebar } from "./repository-sidebar"
import { CommandsTab } from "./commands-tab"
import { ExecutionTab } from "./execution-tab"
import { HistoryTab } from "./history-tab"
import { ComposeTab } from "./compose-tab"
import { computeStats } from "@/lib/command-hub/helpers"

export function CommandHub() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Filtered / grouped data
  const filteredCommands = filterByRepo(commands, selectedRepo)
  const filteredHistory = filterByRepo(executionHistory, selectedRepo)
  const filteredQueue = filterByRepo(runQueue, selectedRepo)
  const filteredLive = filterByRepo(liveExecutions, selectedRepo)
  const filteredPipelines = selectedRepo
    ? pipelines.filter((p) => p.repo === selectedRepo)
    : pipelines

  const statsForTab = selectedRepo
    ? computeStats(filteredHistory)
    : historyStats

  // Calculate running counts for each repo
  const runningCounts: Record<string, number> = {}
  repositories.forEach((repo) => {
    runningCounts[repo.name] = runningCount(repo.name, commands)
  })

  const handleSelectRepo = (repo: string | null) => {
    setSelectedRepo(repo)
    setMobileOpen(false)
  }

  return (
    <div className="relative h-svh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,var(--glow-1),transparent_45%),radial-gradient(circle_at_82%_8%,var(--glow-2),transparent_42%),radial-gradient(circle_at_72%_78%,var(--glow-3),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-20 bottom-12 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-[float_14s_ease-in-out_infinite]" />

      <div className="relative mx-auto grid h-full w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header */}
        <CommandHubHeader onMenuClick={() => setMobileOpen(true)} />

        {/* Body: sidebar + main */}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="hidden min-h-0 lg:flex lg:flex-col lg:sticky lg:top-4 lg:self-start">
            <RepositorySidebar
              selectedRepo={selectedRepo}
              repositories={repositories}
              runningCounts={runningCounts}
              onSelectRepo={handleSelectRepo}
            />
          </aside>

          {/* Mobile sidebar (Sheet) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Repositories</SheetTitle>
                <SheetDescription>
                  Select a repository to filter commands.
                </SheetDescription>
              </SheetHeader>
              <RepositorySidebar
                selectedRepo={selectedRepo}
                repositories={repositories}
                runningCounts={runningCounts}
                onSelectRepo={handleSelectRepo}
              />
            </SheetContent>
          </Sheet>

          {/* Main area with tabs */}
          <Tabs
            defaultValue="commands"
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="mb-4 shrink-0 self-start border border-border/60 bg-card/80 shadow-[0_8px_16px_var(--shadow-color)]">
              <TabsTrigger value="commands">Commands</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="compose">Compose</TabsTrigger>
            </TabsList>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/60 bg-card/80 p-0">
              <div className="min-h-0 flex-1 overflow-y-auto p-4 pr-5">
                {/* Tab: Commands */}
                <TabsContent value="commands" className="flex flex-col">
                  <CommandsTab
                    selectedRepo={selectedRepo}
                    commands={filteredCommands}
                    repositories={repositories}
                  />
                </TabsContent>

                {/* Tab: Execution */}
                <TabsContent value="execution" className="flex flex-col">
                  <ExecutionTab
                    selectedRepo={selectedRepo}
                    liveExecutions={filteredLive}
                    queue={filteredQueue}
                    pipelines={filteredPipelines}
                    repositories={repositories}
                  />
                </TabsContent>

                {/* Tab: History */}
                <TabsContent value="history" className="flex flex-col">
                  <HistoryTab
                    selectedRepo={selectedRepo}
                    executionHistory={filteredHistory}
                    historyStats={statsForTab}
                    repositories={repositories}
                  />
                </TabsContent>

                {/* Tab: Compose */}
                <TabsContent value="compose" className="flex flex-col">
                  <ComposeTab
                    selectedRepo={selectedRepo}
                    repositories={repositories}
                  />
                </TabsContent>
              </div>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
