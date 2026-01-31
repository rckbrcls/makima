import { useState, useEffect, useMemo } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Plus, Shield } from "lucide-react"
import { useAgentState } from "@/hooks/use-agent-state"
import { useUIStore } from "@/stores/ui-store"
import { AgentCard } from "@/components/agents/agent-card"
import { SessionPanel } from "@/components/agents/session-panel"
import { CreateAgentDialog } from "@/components/agents/create-agent-dialog"
import { PageHeader } from "@/components/shared/page-header"
import type {
  Agent,
  ApprovalCardData,
  ApprovalWithAction,
  Action,
  AgentEvent,
} from "@/components/agents/types"
import { AppSidebar } from "@/components/ui/app-sidebar"

// ============================================================================
// Agents Grid Component
// ============================================================================

interface AgentsGridProps {
  agents: Agent[]
  approvalCardData: ApprovalCardData[]
  onStartSession: (agent: Agent) => void
  onDeleteAgent: (agent: Agent) => void
  onSelectAgent: (agent: Agent) => void
  onOpenCreateDialog: () => void
}

function AgentsGrid({
  agents,
  approvalCardData,
  onStartSession,
  onDeleteAgent,
  onSelectAgent,
  onOpenCreateDialog,
}: AgentsGridProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Agents</h2>
          <p className="text-[0.65rem] text-muted-foreground">
            {agents.length} agent(s) configured
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 gap-1"
          onClick={onOpenCreateDialog}
        >
          <Plus className="size-3" />
          Add Agent
        </Button>
      </div>
      <div className="p-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 overflow-y-auto max-h-[calc(100vh-280px)]">
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
          agents.map((agent, index) => (
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
          ))
        )}
      </div>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentsPage() {
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
    toggleMode,
  } = useAgentState()

  const {
    selectedSession,
    selectSession,
    createAgentDialogOpen,
    openCreateAgentDialog,
    closeCreateAgentDialog,
    openApprovalDrawer,
  } = useUIStore()

  // Local state for session details
  const [sessionActions, setSessionActions] = useState<Action[]>([])
  const [sessionEvents, setSessionEvents] = useState<AgentEvent[]>([])

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
      selectSession(session)
    }
  }

  const handleDeleteAgent = (agent: Agent) => {
    void deleteAgent(agent.id)
  }

  const handleEndSession = async (success: boolean) => {
    if (selectedSession) {
      await endSession(selectedSession.id, success)
      selectSession(null)
    }
  }

  const handleToggleMode = async () => {
    return toggleMode()
  }

  const handleRefresh = () => {
    refreshAgentState()
  }

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />

      {/* Header */}
      <PageHeader
        mode={mode}
        pendingCount={pendingApprovals.length}
        onToggleMode={handleToggleMode}
        onOpenApprovals={openApprovalDrawer}
        onRefresh={handleRefresh}
      />

      <div className="relative mx-auto grid mt-10 min-h-0 flex-1 w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 pb-4 sm:px-6 lg:px-8">


        {/* Body: agents grid + session panel */}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_350px]">
          {/* Agents Grid */}
          <AgentsGrid
            agents={agents}
            approvalCardData={approvalCardData}
            onStartSession={handleStartSession}
            onDeleteAgent={handleDeleteAgent}
            onSelectAgent={() => { }}
            onOpenCreateDialog={openCreateAgentDialog}
          />

          {/* Session Panel */}
          {selectedSession ? (
            <SessionPanel
              session={selectedSession}
              actions={sessionActions}
              events={sessionEvents}
              onEndSession={handleEndSession}
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
      </div>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={createAgentDialogOpen}
        onOpenChange={(open) => open ? openCreateAgentDialog() : closeCreateAgentDialog()}
        onCreateAgent={createAgent}
      />
    </div>
  )
}
