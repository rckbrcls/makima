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
import { useCommanderState } from "@/hooks/use-commander-state"
import { CommandHubHeader } from "./command-hub-header"
import { RepositorySidebar } from "./repository-sidebar"
import { CommandsTab } from "./commands-tab"
import { ExecutionTab } from "./execution-tab"
import { HistoryTab } from "./history-tab"
import { PipelineTab } from "./pipeline-tab"
import type { Command } from "./types"

export function CommandHub() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const {
    state,
    runCommand,
    stopCommand,
    addRepository,
    addCommand,
    deleteCommand,
    deleteRepository,
    getExecutionLogs,
  } = useCommanderState()

  const {
    commands,
    executionHistory,
    liveExecutions,
    pipelines,
    repositories,
    runQueue,
  } = state

  // Filtered / grouped data
  const filteredCommands = filterByRepo(commands, selectedRepo)
  const filteredHistory = filterByRepo(executionHistory, selectedRepo)
  const filteredQueue = filterByRepo(runQueue, selectedRepo)
  const filteredLive = filterByRepo(liveExecutions, selectedRepo)
  const filteredPipelines = selectedRepo
    ? pipelines.filter((p) => p.repo === selectedRepo)
    : pipelines


  // Calculate running counts for each repo
  const runningCounts: Record<string, number> = {}
  repositories.forEach((repo) => {
    runningCounts[repo.name] = runningCount(repo.name, commands)
  })

  const handleRunCommand = (command: Command) => {
    void runCommand({
      repo: command.repo,
      name: command.name,
      command: command.command,
      commandType: command.type,
    })
  }

  const handleStopCommand = (repo: string, commandName: string) => {
    void stopCommand({ repo, command: commandName })
  }

  const handleSelectRepo = (repo: string | null) => {
    setSelectedRepo(repo)
    setMobileOpen(false)
  }

  const handleDeleteCommand = (command: Command) => {
    void deleteCommand(command.repo, command.name)
  }

  const handleDeleteRepository = async (repo: string) => {
    const removed = await deleteRepository(repo)
    if (removed && selectedRepo === repo) {
      setSelectedRepo(null)
    }
  }

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,var(--glow-1),transparent_45%),radial-gradient(circle_at_82%_8%,var(--glow-2),transparent_42%),radial-gradient(circle_at_72%_78%,var(--glow-3),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-20 bottom-12 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-[float_14s_ease-in-out_infinite]" />

      <div className="relative mx-auto grid h-full w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header */}
        <CommandHubHeader
          onMenuClick={() => setMobileOpen(true)}
          onAddRepository={addRepository}
          repositories={repositories}
          selectedRepo={selectedRepo}
          onRunCommandInput={runCommand}
          onAddCommand={addCommand}
        />

        {/* Body: sidebar + main */}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="hidden min-h-0 lg:flex lg:flex-col lg:sticky lg:top-4 lg:self-start">
            <RepositorySidebar
              selectedRepo={selectedRepo}
              repositories={repositories}
              runningCounts={runningCounts}
              onSelectRepo={handleSelectRepo}
              onAddRepository={addRepository}
              onDeleteRepository={handleDeleteRepository}
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
                onAddRepository={addRepository}
                onDeleteRepository={handleDeleteRepository}
              />
            </SheetContent>
          </Sheet>

          {/* Main area with tabs */}
          <Tabs
            defaultValue="commands"
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="mb-4 shrink-0 self-start border border-border/60 bg-card/80">
              <TabsTrigger value="commands">Commands</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/60 bg-card/80 p-0">
              <div className="min-h-0 flex-1 overflow-y-auto p-4 pr-5">
                {/* Tab: Commands */}
                <TabsContent value="commands" className="flex flex-col">
                  <CommandsTab
                    selectedRepo={selectedRepo}
                    commands={filteredCommands}
                    repositories={repositories}
                    onRunCommand={handleRunCommand}
                    onStopCommand={handleStopCommand}
                    onDeleteCommand={handleDeleteCommand}
                    onAddCommand={addCommand}
                    onRunCommandInput={runCommand}
                  />
                </TabsContent>

                {/* Tab: Execution */}
                <TabsContent value="execution" className="flex flex-col">
                  <ExecutionTab
                    selectedRepo={selectedRepo}
                    liveExecutions={filteredLive}
                    repositories={repositories}
                    executionHistory={filteredHistory}
                    getExecutionLogs={getExecutionLogs}
                    onStopCommand={handleStopCommand}
                  />
                </TabsContent>

                {/* Tab: Pipeline */}
                <TabsContent value="pipeline" className="flex flex-col">
                  <PipelineTab
                    selectedRepo={selectedRepo}
                    queue={filteredQueue}
                    pipelines={filteredPipelines}
                    repositories={repositories}
                  />
                </TabsContent>

                {/* Tab: Statistics */}
                <TabsContent value="statistics" className="flex flex-col">
                  <HistoryTab state={state} selectedRepo={selectedRepo} />
                </TabsContent>
              </div>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
