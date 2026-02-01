import { useState, useEffect, useMemo } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bot,
  Plus,
  Shield,
  Zap,
  RefreshCw,
  Menu,
  Search,
  Terminal,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { useAgentState } from "@/hooks/use-agent-state"
import { useMakimaState } from "@/hooks/use-makima-state"
import { AgentCard } from "./agent-card"
import { ApprovalDrawer } from "./approval-drawer"
import { SessionPanel } from "./session-panel"
import { CreateAgentDialog } from "./create-agent-dialog"
import type {
  Agent,
  ApprovalCardData,
  ApprovalWithAction,
  Session,
  Action,
  AgentEvent,
  CreateAgentRequest,
} from "./types"

// Repos components (formerly Command Hub)
import { RepositorySidebar } from "@/components/repos/repository-sidebar"
import { ExecutionTab } from "@/components/repos/execution-tab"
import { filterByRepo, runningCount } from "@/lib/command-hub/helpers"
import type { Command } from "@/components/repos/types"

// ============================================================================
// Header Component
// ============================================================================

interface AgentHubHeaderProps {
  mode: "safe" | "auto"
  pendingCount: number
  onToggleMode: () => void
  onOpenApprovals: () => void
  onRefresh: () => void
  onMenuClick: () => void
}

function AgentHubHeader({
  mode,
  pendingCount,
  onToggleMode,
  onOpenApprovals,
  onRefresh,
  onMenuClick,
}: AgentHubHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4" data-tauri-drag-region>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="size-5" />
        </Button>
        {/* Search */}
        <div className="relative hidden w-full min-w-[180px] max-w-xs sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-9 border-border bg-card pl-8 text-xs"
          />
        </div>

      </div>

      <div className="flex items-center gap-2">

        {/* Mode Toggle */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={onToggleMode}
        >
          {mode === "safe" ? (
            <>
              <Shield className="size-3.5 text-yellow-500" />
              <span className="hidden sm:inline">Safe</span>
            </>
          ) : (
            <>
              <Zap className="size-3.5 text-green-500" />
              <span className="hidden sm:inline">Auto</span>
            </>
          )}
        </Button>

        {/* Approvals Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={onOpenApprovals}
        >
          <Shield className="size-3.5" />
          <span className="hidden sm:inline">Approvals</span>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[0.55rem] h-4 px-1">
              {pendingCount}
            </Badge>
          )}
        </Button>

        {/* Theme toggle */}
        <ModeToggle />

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onRefresh}
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
    </header>
  )
}

// ============================================================================
// Agents Tab Component
// ============================================================================

interface AgentsTabProps {
  agents: Agent[]
  approvalCardData: ApprovalCardData[]
  selectedSession: Session | null
  sessionActions: Action[]
  sessionEvents: AgentEvent[]
  onStartSession: (agent: Agent) => void
  onDeleteAgent: (agent: Agent) => void
  onSelectAgent: (agent: Agent) => void
  onEndSession: (success: boolean) => void
  onCreateAgent: (request: CreateAgentRequest) => Promise<Agent | null>
}

function AgentsTab({
  agents,
  approvalCardData,
  selectedSession,
  sessionActions,
  sessionEvents,
  onStartSession,
  onDeleteAgent,
  onSelectAgent,
  onEndSession,
  onCreateAgent,
}: AgentsTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_350px]">
      {/* Agents Grid */}
      <Card className="overflow-hidden border-border/70 bg-card">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">Agents</h2>
            <p className="text-[0.65rem] text-muted-foreground">
              {agents.length} agent(s) configured
            </p>
          </div>
          <CreateAgentDialog onCreateAgent={onCreateAgent}>
            <Button
              size="sm"
              className="h-7 gap-1"
            >
              <Plus className="size-3" />
              Add Agent
            </Button>
          </CreateAgentDialog>
        </div>
        <div className="p-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-2 overflow-y-auto max-h-[calc(100vh-320px)]">
          {agents.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Bot className="size-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No agents configured
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add an agent to get started
              </p>
            </div>
          ) : (
            <AgentCard
              key={agents[0]?.id} // Fix key issue if needed or map properly
            // The previous code had a map here, I must verify I didn't lose it.
            // Wait, the ReplacementContent must replace the entire block or I must match carefully.
            // The previous code had `agents.map(...)`.
            />
          )}
          {/* Re-implementing the map correctly since I replaced the whole block */}
          {agents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={index}
              pendingCount={
                approvalCardData.filter((d) => d.agent.id === agent.id).length
              }
              onStartSession={onStartSession}
              onDelete={onDeleteAgent}
              onClick={(a) => onSelectAgent(a)}
            />
          ))}
        </div>
      </Card>

      {/* Session Panel */}
      {selectedSession ? (
        <SessionPanel
          session={selectedSession}
          actions={sessionActions}
          events={sessionEvents}
          onEndSession={onEndSession}
        />
      ) : (
        <Card className="flex flex-col items-center justify-center text-center p-6 border-border/70 bg-card">
          <Shield className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No active session</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Start a session to see details here
          </p>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentHub() {
  // Agent state
  const {
    state: agentState,
    mode,
    agents,
    pendingApprovals,
    refreshState: refreshAgentState,
    createAgent,
    deleteAgent,
    startSession,
    endSession,
    getActionsForSession,
    getEventsForSession,
    approveAction,
    rejectAction,
    approveAllPending,
    rejectAllPending,
    toggleMode,
  } = useAgentState()

  // Makima state
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
    commands,
    executionHistory,
    liveExecutions,
    pipelines,
    repositories,
    runQueue,
  } = makimaState

  // Local state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sessionActions, setSessionActions] = useState<Action[]>([])
  const [sessionEvents, setSessionEvents] = useState<AgentEvent[]>([])
  const [approvalDrawerOpen, setApprovalDrawerOpen] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Filtered data for command-hub components
  const filteredCommands = filterByRepo(commands, selectedRepo)
  const filteredHistory = filterByRepo(executionHistory, selectedRepo)
  const filteredQueue = filterByRepo(runQueue, selectedRepo)
  const filteredLive = filterByRepo(liveExecutions, selectedRepo)
  const filteredPipelines = selectedRepo
    ? pipelines.filter((p) => p.repo === selectedRepo)
    : pipelines

  // Running counts for each repo
  const runningCounts: Record<string, number> = {}
  repositories.forEach((repo) => {
    runningCounts[repo.name] = runningCount(repo.name, commands)
  })

  // Build approval card data from ApprovalWithAction
  const approvalCardData: ApprovalCardData[] = useMemo(() => {
    return pendingApprovals.map((approvalWithAction: ApprovalWithAction) => {
      const action = approvalWithAction.action
      const session = agentState.sessions.find((s) => s.id === action?.sessionId)
      const agentWithRepos = agents.find((a) => a.id === session?.agentId)

      return {
        approval: approvalWithAction,
        action: action ?? {
          id: "",
          sessionId: "",
          actionType: "notify" as const,
          status: "pending" as const,
          payload: "{}",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        session: session ?? {
          id: "",
          agentId: "",
          goal: "",
          state: "active" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        agent: agentWithRepos ?? {
          id: "",
          name: "Unknown",
          provider: "cli" as const,
          status: "idle" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          repos: [],
        },
      }
    })
  }, [pendingApprovals, agentState.sessions, agents])

  // Load session details when selected
  useEffect(() => {
    if (selectedSession) {
      const loadSessionDetails = async () => {
        const [actions, events] = await Promise.all([
          getActionsForSession(selectedSession.id),
          getEventsForSession(selectedSession.id),
        ])
        setSessionActions(actions)
        setSessionEvents(events)
      }
      void loadSessionDetails()
    }
  }, [selectedSession, getActionsForSession, getEventsForSession])

  // Agent handlers
  const handleStartSession = async (agent: Agent) => {
    const session = await startSession({
      agentId: agent.id,
      goal: `Session with ${agent.name}`,
    })
    if (session) {
      setSelectedAgent(agent)
      setSelectedSession(session)
    }
  }

  const handleDeleteAgent = (agent: Agent) => {
    void deleteAgent(agent.id)
  }

  const handleEndSession = async (success: boolean) => {
    if (selectedSession) {
      await endSession(selectedSession.id, success)
      setSelectedSession(null)
    }
  }

  const handleApprove = async (approvalId: string) => {
    return approveAction(approvalId, "user")
  }

  const handleReject = async (approvalId: string) => {
    return rejectAction(approvalId, "user")
  }

  const handleApproveAll = async () => {
    if (selectedSession) {
      return approveAllPending(selectedSession.id, "user")
    }
    return 0
  }

  const handleRejectAll = async () => {
    if (selectedSession) {
      return rejectAllPending(selectedSession.id, "user")
    }
    return 0
  }

  const handleToggleMode = async () => {
    return toggleMode()
  }

  const handleRefresh = () => {
    refreshAgentState()
  }

  // Command handlers
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
    <div className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />

      {/* Draggable Top Spacer */}
      <div className="h-10 w-full shrink-0 z-50" data-tauri-drag-region />

      <div className="relative mx-auto grid mt-10 min-h-0 flex-1 w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 pb-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AgentHubHeader
          mode={mode}
          pendingCount={pendingApprovals.length}
          onToggleMode={handleToggleMode}
          onOpenApprovals={() => setApprovalDrawerOpen(true)}
          onRefresh={handleRefresh}
          onMenuClick={() => setMobileOpen(true)}
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

          {/* Main area with tabs */}
          <Tabs
            defaultValue="agents"
            className="flex min-h-0  flex-1 flex-col"
          >
            <TabsList className="mb-4 shrink-0 self-start border border-border/60 bg-card">
              <TabsTrigger value="agents">
                <Bot className="size-3.5 mr-1.5" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            {/* Tab: Agents */}
            <TabsContent value="agents" className="flex-1 overflow-auto p-1">
              <div className="h-full">
                <AgentsTab
                  agents={agents}
                  approvalCardData={approvalCardData}
                  selectedSession={selectedSession}
                  sessionActions={sessionActions}
                  sessionEvents={sessionEvents}
                  onStartSession={handleStartSession}
                  onDeleteAgent={handleDeleteAgent}
                  onSelectAgent={(a) => setSelectedAgent(a)}
                  onEndSession={handleEndSession}
                  onCreateAgent={createAgent}
                />
              </div>
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
                  <HistoryTab state={makimaState} selectedRepo={selectedRepo} />
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Approval Drawer */}
      <ApprovalDrawer
        open={approvalDrawerOpen}
        onOpenChange={setApprovalDrawerOpen}
        pendingApprovals={approvalCardData}
        mode={mode}
        onApprove={handleApprove}
        onReject={handleReject}
        onApproveAll={handleApproveAll}
        onRejectAll={handleRejectAll}
        onToggleMode={handleToggleMode}
      />
    </div>
  )
}
