import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Terminal, History, BarChart3 } from "lucide-react"
import { useAgentState } from "@/hooks/use-agent-state"
import { useCompanyState } from "@/hooks/use-company-state"
import { useUIStore } from "@/stores/ui-store"
import { PageHeader } from "@/components/shared/page-header"
import { RepositorySidebar } from "@/components/repos/repository-sidebar"
import { CommandsTab } from "@/components/repos/commands-tab"
import { ExecutionTab } from "@/components/repos/execution-tab"
import { HistoryTab } from "@/components/repos/history-tab"
import { filterByRepo, runningCount } from "@/lib/command-hub/helpers"
import type { Command } from "@/components/repos/types"

export function ReposPage() {
  const {
    mode,
    pendingApprovals,
    toggleMode,
  } = useAgentState()

  const {
    state: companyState,
    runCommand,
    stopCommand,
    addRepository,
    addCommand,
    updateCommand,
    deleteCommand,
    deleteRepository,
    getExecutionLogs,
  } = useCompanyState()

  const {
    selectedRepo,
    selectRepo,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    openApprovalDrawer,
  } = useUIStore()

  const {
    commands,
    executionHistory,
    liveExecutions,
    repositories,
  } = companyState

  // Filtered data for repos components
  const filteredCommands = filterByRepo(commands, selectedRepo)
  const filteredHistory = filterByRepo(executionHistory, selectedRepo)
  const filteredLive = filterByRepo(liveExecutions, selectedRepo)

  // Running counts for each repo
  const runningCounts: Record<string, number> = {}
  repositories.forEach((repo) => {
    runningCounts[repo.name] = runningCount(repo.name, commands)
  })

  const handleToggleMode = async () => {
    return toggleMode()
  }

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
    selectRepo(repo)
    setMobileSidebarOpen(false)
  }

  const handleDeleteCommand = (command: Command) => {
    void deleteCommand(command.repo, command.name)
  }

  const handleDeleteRepository = async (repo: string) => {
    const removed = await deleteRepository(repo)
    if (removed && selectedRepo === repo) {
      selectRepo(null)
    }
  }

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />

      {/* Draggable Top Spacer */}
      <div className="h-10 w-full shrink-0 z-50" data-tauri-drag-region />

      <div className="relative mx-auto grid mt-10 min-h-0 flex-1 w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHeader
          mode={mode}
          pendingCount={pendingApprovals.length}
          onToggleMode={handleToggleMode}
          onOpenApprovals={openApprovalDrawer}
          onMenuClick={() => setMobileSidebarOpen(true)}
          searchPlaceholder="Search repos..."
        />

        {/* Body: sidebar + main */}
        <div className="grid flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
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
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
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
            <TabsList className="mb-4 shrink-0 self-start border border-border/60 bg-card">
              <TabsTrigger value="commands">
                <Terminal className="size-3.5 mr-1.5" />
                Commands
              </TabsTrigger>
              <TabsTrigger value="execution">
                <History className="size-3.5 mr-1.5" />
                Execution
              </TabsTrigger>
              <TabsTrigger value="statistics">
                <BarChart3 className="size-3.5 mr-1.5" />
                Statistics
              </TabsTrigger>
            </TabsList>

            {/* Tab: Commands */}
            <TabsContent value="commands" className="flex-1 overflow-auto p-1">
              <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/60 bg-card p-0">
                <div className="min-h-0 flex-1 overflow-y-auto p-4 pr-5">
                  <CommandsTab
                    selectedRepo={selectedRepo}
                    commands={filteredCommands}
                    repositories={repositories}
                    onRunCommand={handleRunCommand}
                    onStopCommand={handleStopCommand}
                    onDeleteCommand={handleDeleteCommand}
                    onAddCommand={addCommand}
                    onUpdateCommand={updateCommand}
                    onRunCommandInput={runCommand}
                  />
                </div>
              </Card>
            </TabsContent>

            {/* Tab: Execution */}
            <TabsContent value="execution" className="flex-1 overflow-auto p-1">
              <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/60 bg-card p-0">
                <div className="min-h-0 flex-1 overflow-y-auto p-4 pr-5">
                  <ExecutionTab
                    selectedRepo={selectedRepo}
                    liveExecutions={filteredLive}
                    repositories={repositories}
                    executionHistory={filteredHistory}
                    getExecutionLogs={getExecutionLogs}
                    onStopCommand={handleStopCommand}
                  />
                </div>
              </Card>
            </TabsContent>

            {/* Tab: Statistics */}
            <TabsContent value="statistics" className="flex-1 overflow-auto p-1">
              <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/60 bg-card p-0">
                <div className="min-h-0 flex-1 overflow-y-auto p-4 pr-5">
                  <HistoryTab state={companyState} selectedRepo={selectedRepo} />
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
