import { useState, useEffect, useMemo } from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bot,
  Plus,
  Shield,
  Zap,
  RefreshCw,
} from "lucide-react"
import { useAgentState } from "@/hooks/use-agent-state"
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
} from "./types"

// ============================================================================
// Header Component
// ============================================================================

interface AgentHubHeaderProps {
  mode: "safe" | "auto"
  pendingCount: number
  onToggleMode: () => void
  onOpenApprovals: () => void
  onRefresh: () => void
}

function AgentHubHeader({
  mode,
  pendingCount,
  onToggleMode,
  onOpenApprovals,
  onRefresh,
}: AgentHubHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center border border-border bg-card">
          <Bot className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Agent Hub</h1>
          <p className="text-xs text-muted-foreground">
            Manage AI agents and sessions
          </p>
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
              Safe Mode
            </>
          ) : (
            <>
              <Zap className="size-3.5 text-green-500" />
              Auto Mode
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
          Approvals
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-[0.55rem] h-4 px-1">
              {pendingCount}
            </Badge>
          )}
        </Button>

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
// Main Component
// ============================================================================

export function AgentHub() {
  const {
    state,
    mode,
    agents,
    pendingApprovals,
    refreshState,
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

  // Local state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sessionActions, setSessionActions] = useState<Action[]>([])
  const [sessionEvents, setSessionEvents] = useState<AgentEvent[]>([])
  const [approvalDrawerOpen, setApprovalDrawerOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Build approval card data from ApprovalWithAction
  const approvalCardData: ApprovalCardData[] = useMemo(() => {
    return pendingApprovals.map((approvalWithAction: ApprovalWithAction) => {
      // Find the session for this action
      const action = approvalWithAction.action
      const session = state.sessions.find((s) => s.id === action?.sessionId)
      // agents is AgentWithRepos[], get the base agent
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
  }, [pendingApprovals, state.sessions, agents])

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

  // Handlers
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

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto grid h-full w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AgentHubHeader
          mode={mode}
          pendingCount={pendingApprovals.length}
          onToggleMode={handleToggleMode}
          onOpenApprovals={() => setApprovalDrawerOpen(true)}
          onRefresh={refreshState}
        />

        {/* Main Content */}
        <div className="grid gap-4 lg:grid-cols-[1fr_350px]">
          {/* Agents Grid */}
          <Card className="overflow-hidden border-border/70 bg-card/80">
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
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="size-3" />
                Add Agent
              </Button>
            </div>
            <div className="p-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 overflow-y-auto max-h-[calc(100vh-220px)]">
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
                    onStartSession={handleStartSession}
                    onDelete={handleDeleteAgent}
                    onClick={(a) => setSelectedAgent(a)}
                  />
                ))
              )}
            </div>
          </Card>

          {/* Session Panel */}
          {selectedSession ? (
            <SessionPanel
              session={selectedSession}
              actions={sessionActions}
              events={sessionEvents}
              onEndSession={handleEndSession}
            />
          ) : (
            <Card className="flex flex-col items-center justify-center text-center p-6 border-border/70 bg-card/80">
              <Shield className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No active session</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Start a session to see details here
              </p>
            </Card>
          )}
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

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateAgent={createAgent}
      />
    </div>
  )
}
