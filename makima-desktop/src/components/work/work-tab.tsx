import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { Bot, Loader2, Play, Plus, Shield, Trash2, X, Zap } from "lucide-react"

import { WorkApprovalBanner } from "./work-approval-banner"
import { WorkChat } from "./work-chat"
import { WorkSetupWizard } from "./work-setup-wizard"
import type { Agent, Run, Session } from "@/lib/work-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useOpenClawAgent,
  useOpenClawApprovals,
  useOpenClawConnection,
  useOpenClawFileConfig,
  useOpenClawGateway,
} from "@/hooks/openclaw"
import { cn } from "@/lib/utils"
import {
  useOpenClawConnected,
  useOpenClawConnectionStatus,
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
  useWorkSessionRuns,
} from "@/stores"

// ============================================================================
// Context
// ============================================================================

interface WorkDomainContextValue {
  // Agent operations
  loadAgents: () => Promise<void>
  createAgent: (
    id: string,
    name: string,
    model?: string,
  ) => Promise<Agent | null>
  deleteAgent: (id: string) => Promise<boolean>
  isRestarting: boolean

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
  const isConnected = useOpenClawConnected()
  const [isRestarting, setIsRestarting] = useState(false)

  const {
    addAgent,
    removeAgent,
    addSession,
    updateSessionStatus,
    setIsLoadingAgents,
    setError,
    clearChatMessages,
  } = useWorkDomainActions()

  const { detectInstallation, refreshGatewayStatus, stopGateway, startGateway } =
    useOpenClawGateway()
  useOpenClawConnection() // Sets up event listeners for connection status
  const { loadAgents: loadOpenClawAgents } = useOpenClawAgent()
  const { approve, reject } = useOpenClawApprovals()
  const { readFileConfig, writeFileConfig } = useOpenClawFileConfig()

  // Load agents from OpenClaw when connected
  const loadAgents = useCallback(async () => {
    if (!isConnected) {
      setIsLoadingAgents(false)
      return
    }
    await loadOpenClawAgents()
  }, [isConnected, loadOpenClawAgents, setIsLoadingAgents])

  // Restart gateway and reload agents
  const restartGateway = useCallback(async () => {
    setIsRestarting(true)
    try {
      await stopGateway()
      // Brief delay to let the process fully stop
      await new Promise((r) => setTimeout(r, 500))
      await startGateway()
      // Wait for connection to re-establish
      await new Promise((r) => setTimeout(r, 1500))
      await loadOpenClawAgents()
    } finally {
      setIsRestarting(false)
    }
  }, [stopGateway, startGateway, loadOpenClawAgents])

  const createAgent = useCallback(
    async (
      id: string,
      name: string,
      model?: string,
    ): Promise<Agent | null> => {
      try {
        const config = await readFileConfig()
        if (!config) {
          setError("Could not read OpenClaw config file")
          return null
        }

        const agentsList = config.agents?.list ?? []

        // Check for duplicate id
        if (agentsList.some((a) => a.id === id)) {
          setError(`Agent with id "${id}" already exists`)
          return null
        }

        const updatedConfig = {
          ...config,
          agents: {
            list: [
              ...agentsList,
              {
                id,
                name: name || undefined,
                model: model || undefined,
              },
            ],
          },
        }

        const written = await writeFileConfig(updatedConfig)
        if (!written) return null

        await restartGateway()

        const newAgent: Agent = {
          id,
          name,
          config: { model },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        return newAgent
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [readFileConfig, writeFileConfig, restartGateway, setError],
  )

  const deleteAgent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const config = await readFileConfig()
        if (!config) {
          setError("Could not read OpenClaw config file")
          return false
        }

        const agentsList = config.agents?.list ?? []
        const updatedConfig = {
          ...config,
          agents: {
            list: agentsList.filter((a) => a.id !== id),
          },
        }

        const written = await writeFileConfig(updatedConfig)
        if (!written) return false

        removeAgent(id)
        await restartGateway()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [readFileConfig, writeFileConfig, restartGateway, removeAgent, setError],
  )

  const startSession = useCallback(
    async (agentId: string, title?: string): Promise<Session | null> => {
      try {
        const newSession: Session = {
          id: `session-${Date.now()}`,
          agentId,
          title: title ?? "New Session",
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        addSession(newSession)
        clearChatMessages()
        return newSession
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [addSession, clearChatMessages, setError],
  )

  const endSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
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
      return approve(approvalId)
    },
    [approve],
  )

  const rejectAction = useCallback(
    async (approvalId: string): Promise<boolean> => {
      return reject(approvalId)
    },
    [reject],
  )

  // On mount: detect installation and gateway status
  useEffect(() => {
    detectInstallation()
    refreshGatewayStatus()
  }, [detectInstallation, refreshGatewayStatus])

  // When connected, load agents
  useEffect(() => {
    if (isConnected) {
      loadAgents()
    }
  }, [isConnected, loadAgents])

  const value: WorkDomainContextValue = {
    loadAgents,
    createAgent,
    deleteAgent,
    isRestarting,
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
  const isConnected = useOpenClawConnected()
  const connectionStatus = useOpenClawConnectionStatus()

  const { setActiveAgentId, setActiveSessionId, toggleExecutionMode } =
    useWorkDomainActions()
  const { startSession, createAgent, deleteAgent, isRestarting } =
    useWorkDomainContext()

  const [isCreating, setIsCreating] = useState(false)
  const [newAgentId, setNewAgentId] = useState("")
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentModel, setNewAgentModel] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      setActiveAgentId(agentId)
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

  const handleSaveAgent = useCallback(async () => {
    if (!newAgentId.trim()) return
    setIsSaving(true)
    const agent = await createAgent(
      newAgentId.trim(),
      newAgentName.trim() || newAgentId.trim(),
      newAgentModel.trim() || undefined,
    )
    setIsSaving(false)
    if (agent) {
      setActiveAgentId(agent.id)
      setIsCreating(false)
      setNewAgentId("")
      setNewAgentName("")
      setNewAgentModel("")
    }
  }, [
    newAgentId,
    newAgentName,
    newAgentModel,
    createAgent,
    setActiveAgentId,
  ])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
    setNewAgentId("")
    setNewAgentName("")
    setNewAgentModel("")
  }, [])

  const handleDeleteAgent = useCallback(
    async (e: React.MouseEvent, agentId: string) => {
      e.stopPropagation()
      await deleteAgent(agentId)
    },
    [deleteAgent],
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading agents...</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Connection Status */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "size-2 rounded-full",
            isConnected ? "bg-emerald-500" : "bg-rose-500",
          )}
        />
        <span className="text-muted-foreground text-xs">
          {isRestarting
            ? "Restarting gateway..."
            : isConnected
              ? `Connected${connectionStatus.gatewayVersion ? ` (v${connectionStatus.gatewayVersion})` : ""}`
              : "Offline"}
        </span>
        {isRestarting && (
          <Loader2 className="text-muted-foreground size-3 animate-spin" />
        )}
      </div>

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
        {agents.length === 0 && isConnected && !isCreating && (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            No agents configured in the gateway
          </p>
        )}
        {agents.map((agent) => (
          <div key={agent.id} className="group">
            <button
              onClick={() => handleSelectAgent(agent.id)}
              className={cn(
                "w-full rounded-lg p-2 text-left transition-colors",
                activeAgentId === agent.id ? "glass-selected" : "glass-hover",
              )}
            >
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-sky-500" />
                <span className="text-foreground flex-1 text-sm font-medium">
                  {agent.name}
                </span>
                <button
                  onClick={(e) => handleDeleteAgent(e, agent.id)}
                  className="text-muted-foreground hover:text-destructive-foreground hidden rounded p-0.5 transition-colors group-hover:block"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {agent.description && (
                <p className="text-muted-foreground mt-0.5 pl-6 text-xs">
                  {agent.description}
                </p>
              )}
            </button>

            {/* Sessions for this agent (when expanded) */}
            {activeAgentId === agent.id && sessions.length > 0 && (
              <div className="ml-6 mt-1 space-y-0.5 border-l border-border pl-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-1 text-left text-xs transition-colors",
                      activeSessionId === session.id
                        ? "glass-selected text-foreground"
                        : "glass-hover text-muted-foreground",
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
                              : "bg-muted-foreground",
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

      {/* Agent Creation Form */}
      {isCreating && (
        <div className="glass mt-2 space-y-2 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-xs font-medium">
              New Agent
            </span>
            <button
              onClick={handleCancelCreate}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <Input
            placeholder="my-agent"
            value={newAgentId}
            onChange={(e) =>
              setNewAgentId(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              )
            }
            className="h-7 text-xs"
          />
          <Input
            placeholder="My Agent (optional)"
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            className="h-7 text-xs"
          />
          <Input
            placeholder="anthropic/claude-sonnet-4-5 (optional)"
            value={newAgentModel}
            onChange={(e) => setNewAgentModel(e.target.value)}
            className="h-7 text-xs"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCancelCreate}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-sky-600 text-sky-500"
              onClick={handleSaveAgent}
              disabled={!newAgentId.trim() || isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      )}

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
        {!isCreating && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full justify-start gap-2"
            onClick={() => setIsCreating(true)}
            disabled={!isConnected || isRestarting}
          >
            <Plus className="size-3.5" />
            Create Agent
          </Button>
        )}
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
  const isConnected = useOpenClawConnected()

  // Show setup card when not connected
  if (!isConnected) {
    return <WorkSetupWizard />
  }

  // Empty state - no agent selected
  if (!activeAgent) {
    return (
      <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border">
        <Bot className="mb-4 size-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Select an agent to start
        </p>
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
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground font-medium">
              {activeSession.title}
            </h3>
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
                  : "border-border bg-muted text-muted-foreground",
            )}
          >
            {activeSession.status}
          </Badge>
        </div>
      </header>

      {/* Approval Banner */}
      <WorkApprovalBanner />

      {/* Chat + Runs */}
      <WorkChat />

      {/* Runs (if any exist alongside chat) */}
      {runs.length > 0 && (
        <div className="border-t border-border p-4">
          <h4 className="text-muted-foreground mb-2 text-xs font-medium">
            Runs ({runs.length})
          </h4>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        </div>
      )}
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
    pending: "border-border bg-muted text-muted-foreground",
    waiting_approval: "border-amber-600 bg-amber-900 text-amber-300",
    running: "border-sky-600 bg-sky-900 text-sky-300",
    completed: "border-emerald-600 bg-emerald-900 text-emerald-300",
    failed: "border-rose-600 bg-rose-900 text-rose-300",
    cancelled: "border-border bg-muted text-muted-foreground",
  }

  return (
    <div className="glass rounded-lg p-3">
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
            <pre className="bg-background mt-2 max-h-32 overflow-auto rounded p-2 text-xs text-muted-foreground">
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
