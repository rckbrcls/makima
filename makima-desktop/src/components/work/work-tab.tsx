import { createContext, useCallback, useContext, useEffect } from "react"
import { Bot, Play, Shield, ShieldOff, Zap } from "lucide-react"

import type { Agent, Approval, Run, Session } from "@/lib/work-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useWorkActiveAgent,
  useWorkActiveAgentId,
  useWorkActiveSession,
  useWorkActiveSessionId,
  useWorkAgentSessions,
  useWorkAgents,
  useWorkDomainActions,
  useWorkDomainStore,
  useWorkExecutionMode,
  useWorkIsLoadingAgents,
  useWorkPendingApprovals,
  useWorkSessionRuns,
} from "@/stores/work-domain-store"

// ============================================================================
// Context
// ============================================================================

interface WorkDomainContextValue {
  // Agent operations
  loadAgents: () => Promise<void>
  createAgent: (name: string, description?: string) => Promise<Agent | null>
  deleteAgent: (id: string) => Promise<boolean>

  // Session operations
  startSession: (agentId: string, title?: string) => Promise<Session | null>
  endSession: (sessionId: string) => Promise<boolean>

  // Approval operations
  approveAction: (approvalId: string) => Promise<boolean>
  rejectAction: (approvalId: string) => Promise<boolean>
}

const WorkDomainContext = createContext<WorkDomainContextValue | null>(null)

function useWorkDomainContext() {
  const ctx = useContext(WorkDomainContext)
  if (!ctx)
    throw new Error(
      "useWorkDomainContext must be used within WorkDomainProvider",
    )
  return ctx
}

// ============================================================================
// Provider
// ============================================================================

interface WorkDomainProviderProps {
  children: React.ReactNode
}

export function WorkDomainProvider({ children }: WorkDomainProviderProps) {
  const {
    setAgents,
    addAgent,
    removeAgent,
    addSession,
    updateSessionStatus,
    resolveApproval,
    setIsLoadingAgents,
    setError,
  } = useWorkDomainActions()

  // TODO: Replace with actual Tauri IPC calls when backend is implemented
  const loadAgents = useCallback(async () => {
    try {
      setIsLoadingAgents(true)
      // Mock data for now - will be replaced with actual DB call
      const mockAgents: Array<Agent> = [
        {
          id: "agent-1",
          name: "Jarvis",
          description: "General-purpose assistant agent",
          config: {
            provider: "ollama",
            model: "llama3.2",
            systemPrompt: "You are Jarvis, a helpful assistant.",
          },
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now(),
        },
        {
          id: "agent-2",
          name: "Code Agent",
          description: "Specialized for code generation and review",
          config: {
            provider: "ollama",
            model: "codellama",
            systemPrompt: "You are a code expert.",
            tools: ["file_read", "file_write", "bash"],
          },
          createdAt: Date.now() - 172800000,
          updatedAt: Date.now(),
        },
      ]
      setAgents(mockAgents)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoadingAgents(false)
    }
  }, [setAgents, setIsLoadingAgents, setError])

  const createAgent = useCallback(
    async (name: string, description?: string): Promise<Agent | null> => {
      try {
        // TODO: Replace with actual Tauri IPC call
        const newAgent: Agent = {
          id: `agent-${Date.now()}`,
          name,
          description,
          config: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        addAgent(newAgent)
        return newAgent
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [addAgent, setError],
  )

  const deleteAgent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // TODO: Replace with actual Tauri IPC call
        removeAgent(id)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [removeAgent, setError],
  )

  const startSession = useCallback(
    async (agentId: string, title?: string): Promise<Session | null> => {
      try {
        // TODO: Replace with actual Tauri IPC call
        const newSession: Session = {
          id: `session-${Date.now()}`,
          agentId,
          title: title ?? "New Session",
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        addSession(newSession)
        return newSession
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [addSession, setError],
  )

  const endSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        // TODO: Replace with actual Tauri IPC call
        updateSessionStatus(sessionId, "finished")
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [updateSessionStatus, setError],
  )

  const approveAction = useCallback(
    async (approvalId: string): Promise<boolean> => {
      try {
        // TODO: Replace with actual Tauri IPC call
        resolveApproval(approvalId, "approved")
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [resolveApproval, setError],
  )

  const rejectAction = useCallback(
    async (approvalId: string): Promise<boolean> => {
      try {
        // TODO: Replace with actual Tauri IPC call
        resolveApproval(approvalId, "rejected")
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [resolveApproval, setError],
  )

  // Load agents on mount
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const value: WorkDomainContextValue = {
    loadAgents,
    createAgent,
    deleteAgent,
    startSession,
    endSession,
    approveAction,
    rejectAction,
  }

  return (
    <WorkDomainContext.Provider value={value}>
      {children}
    </WorkDomainContext.Provider>
  )
}

// ============================================================================
// Sidebar
// ============================================================================

export function WorkSidebar() {
  const agents = useWorkAgents()
  const activeAgentId = useWorkActiveAgentId()
  const sessions = useWorkAgentSessions()
  const activeSessionId = useWorkActiveSessionId()
  const isLoading = useWorkIsLoadingAgents()
  const executionMode = useWorkExecutionMode()

  const { setActiveAgentId, setActiveSessionId, toggleExecutionMode } =
    useWorkDomainActions()
  const { startSession, createAgent } = useWorkDomainContext()

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      setActiveAgentId(agentId)
      // Auto-select first session if available
      const agentSessions = useWorkDomainStore
        .getState()
        .sessions.filter((s) => s.agentId === agentId)
      if (agentSessions.length > 0) {
        setActiveSessionId(agentSessions[0].id)
      } else {
        setActiveSessionId(null)
      }
    },
    [setActiveAgentId, setActiveSessionId],
  )

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId)
    },
    [setActiveSessionId],
  )

  const handleNewSession = useCallback(async () => {
    if (!activeAgentId) return
    const session = await startSession(activeAgentId)
    if (session) {
      setActiveSessionId(session.id)
    }
  }, [activeAgentId, startSession, setActiveSessionId])

  const handleCreateAgent = useCallback(async () => {
    const agent = await createAgent("New Agent")
    if (agent) {
      setActiveAgentId(agent.id)
    }
  }, [createAgent, setActiveAgentId])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading agents...</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Mode Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-sm font-bold">AGENTS</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleExecutionMode}
          className={cn(
            "gap-1.5",
            executionMode === "safe"
              ? "border-emerald-600 text-emerald-500"
              : "border-amber-600 text-amber-500",
          )}
        >
          {executionMode === "safe" ? (
            <>
              <Shield className="size-3.5" />
              Safe
            </>
          ) : (
            <>
              <Zap className="size-3.5" />
              Auto
            </>
          )}
        </Button>
      </div>

      {/* Agents List */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {agents.map((agent) => (
          <div key={agent.id}>
            <button
              onClick={() => handleSelectAgent(agent.id)}
              className={cn(
                "w-full rounded-lg p-2 text-left transition-colors",
                activeAgentId === agent.id ? "glass-selected" : "glass-hover",
              )}
            >
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-sky-500" />
                <span className="text-foreground text-sm font-medium">
                  {agent.name}
                </span>
              </div>
              {agent.description && (
                <p className="text-muted-foreground mt-0.5 pl-6 text-xs">
                  {agent.description}
                </p>
              )}
            </button>

            {/* Sessions for this agent (when expanded) */}
            {activeAgentId === agent.id && sessions.length > 0 && (
              <div className="ml-6 mt-1 space-y-0.5 border-l border-zinc-800 pl-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-left text-xs transition-colors",
                      activeSessionId === session.id
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          session.status === "active"
                            ? "bg-emerald-500"
                            : session.status === "error"
                              ? "bg-rose-500"
                              : "bg-zinc-600",
                        )}
                      />
                      {session.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {activeAgentId && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleNewSession}
          >
            <Play className="size-3.5" />
            New Session
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-zinc-500"
          onClick={handleCreateAgent}
        >
          <Bot className="size-3.5" />
          Create Agent
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Workspace
// ============================================================================

export function WorkWorkspace() {
  const activeAgent = useWorkActiveAgent()
  const activeSession = useWorkActiveSession()
  const runs = useWorkSessionRuns()
  const pendingApprovals = useWorkPendingApprovals()
  const executionMode = useWorkExecutionMode()

  const { approveAction, rejectAction } = useWorkDomainContext()

  // Empty state - no agent selected
  if (!activeAgent) {
    return (
      <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
        <Bot className="mb-4 size-12 text-zinc-700" />
        <p className="text-muted-foreground text-sm">Select an agent to start</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Agents execute real commands and manipulate your filesystem
        </p>
      </section>
    )
  }

  // Empty state - no session active
  if (!activeSession) {
    return (
      <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
        <div className="text-center">
          <h3 className="text-foreground mb-2 text-lg font-medium">
            {activeAgent.name}
          </h3>
          {activeAgent.description && (
            <p className="text-muted-foreground mb-4 text-sm">
              {activeAgent.description}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Start a new session to begin execution
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground font-medium">{activeSession.title}</h3>
            <p className="text-muted-foreground text-xs">
              Agent: {activeAgent.name}
            </p>
          </div>
          <Badge
            className={cn(
              "border",
              activeSession.status === "active"
                ? "border-emerald-600 bg-emerald-900 text-emerald-300"
                : activeSession.status === "error"
                  ? "border-rose-600 bg-rose-900 text-rose-300"
                  : "border-zinc-600 bg-zinc-900 text-zinc-300",
            )}
          >
            {activeSession.status}
          </Badge>
        </div>
      </header>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="border-b border-amber-900/50 bg-amber-950/30 p-4">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-400">
            <ShieldOff className="size-4" />
            Pending Approvals ({pendingApprovals.length})
          </h4>
          <div className="space-y-2">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between rounded-lg bg-zinc-900/50 p-3"
              >
                <div>
                  <p className="text-foreground text-sm">
                    {approval.action.description}
                  </p>
                  <code className="mt-1 text-xs text-zinc-500">
                    {approval.action.payload}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-600 text-emerald-500 hover:bg-emerald-950"
                    onClick={() => approveAction(approval.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-600 text-rose-500 hover:bg-rose-950"
                    onClick={() => rejectAction(approval.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Runs */}
      <div className="flex-1 overflow-y-auto p-4">
        {runs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-muted-foreground text-sm">No runs yet</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {executionMode === "safe"
                ? "All actions will require approval"
                : "Actions will execute automatically"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>

      {/* Composer placeholder */}
      <div className="border-t border-zinc-800 p-4">
        <div className="bg-muted/50 flex items-center justify-center rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            Agent execution interface coming soon...
          </p>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Run Card Component
// ============================================================================

interface RunCardProps {
  run: Run
}

function RunCard({ run }: RunCardProps) {
  const statusColors = {
    pending: "border-zinc-600 bg-zinc-900 text-zinc-400",
    waiting_approval: "border-amber-600 bg-amber-900 text-amber-300",
    running: "border-sky-600 bg-sky-900 text-sky-300",
    completed: "border-emerald-600 bg-emerald-900 text-emerald-300",
    failed: "border-rose-600 bg-rose-900 text-rose-300",
    cancelled: "border-zinc-600 bg-zinc-900 text-zinc-400",
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge className={cn("border", statusColors[run.status])}>
              {run.status}
            </Badge>
            <span className="text-muted-foreground text-xs">{run.type}</span>
          </div>
          <p className="text-foreground mt-2 text-sm">{run.input}</p>
          {run.output && (
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-400">
              {run.output}
            </pre>
          )}
          {run.error && (
            <p className="mt-2 text-xs text-rose-400">{run.error}</p>
          )}
        </div>
      </div>
      {run.duration !== undefined && (
        <p className="text-muted-foreground mt-2 text-xs">
          Duration: {run.duration}ms
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Legacy exports for backwards compatibility
// ============================================================================

export { WorkDomainProvider as WorkTabProvider }
export { WorkSidebar as WorkTabSidebar }
export { WorkWorkspace as WorkTabWorkspace }
