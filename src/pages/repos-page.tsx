import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Terminal, History } from "lucide-react"
import { useAgentState } from "@/hooks/use-agent-state"
import { useMakimaState } from "@/hooks/use-makima-state"
import { useUIStore } from "@/stores/ui-store"
import { PageHeader } from "@/components/shared/page-header"
import { RepositorySidebar } from "@/components/repos/repository-sidebar"
import { CommandsTab } from "@/components/repos/commands-tab"
import { ExecutionTab } from "@/components/repos/execution-tab"
import { filterByRepo, runningCount } from "@/lib/command-hub/helpers"
import type { Command } from "@/components/repos/types"
import { TextureOverlay } from "@/components/ui/texture-overlay"

export function ReposPage() {
  const {
    mode,
    pendingApprovals,
    toggleMode,
  } = useAgentState()

  const {
    state: makimaState,
    runCommand,
    stopCommand,
    addRepository,
    addCommand,
    updateCommand,
    deleteCommand,
    deleteRepository,
    getExecutionLogs,
  } = useMakimaState()

  const {
    selectedRepo,
    selectRepo,
    setMobileSidebarOpen,
    openApprovalDrawer,
  } = useUIStore()

  const {
    commands,
    executionHistory,
    liveExecutions,
    repositories,
  } = makimaState

  // Filtered data for repos components
  const filteredCommands = filterByRepo(commands, selectedRepo)
  const filteredHistory = filterByRepo(executionHistory, selectedRepo)
  const filteredLive = filterByRepo(liveExecutions, selectedRepo)

  // Running counts for each repo
  const runningCounts: Record<string, number> = {}
  repositories.forEach((repo) => {
    runningCounts[repo.name] = runningCount(repo.name, commands)
  })

  useEffect(() => {
    if (selectedRepo === null && repositories.length > 0) {
      selectRepo(repositories[0].name)
    }
  }, [selectedRepo, repositories, selectRepo])

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
      <TextureOverlay texture="noise" className="mix-blend-overlay" />

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
      <div className="grid relative  w-full min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_2fr_2fr] lg:grid-rows-[minmax(0,1fr)]">
        <RepositorySidebar
          selectedRepo={selectedRepo}
          repositories={repositories}
          runningCounts={runningCounts}
          onSelectRepo={handleSelectRepo}
          onAddRepository={addRepository}
          onDeleteRepository={handleDeleteRepository}
        />

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

        <ExecutionTab
          selectedRepo={selectedRepo}
          liveExecutions={filteredLive}
          repositories={repositories}
          executionHistory={filteredHistory}
          getExecutionLogs={getExecutionLogs}
          onStopCommand={handleStopCommand}
        />

      </div>
    </div >
  )
}
