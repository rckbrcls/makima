import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Bot, Loader2, Play, Plus, Shield, Trash2, X, Zap } from "lucide-react"
import { WorkModelField } from "./work-model-field"
import { WorkWorkspace as WorkWorkspaceContent } from "./work-workspace"
import type { Agent, Session } from "@/lib/work-types"
import type { OpenClawModelOption } from "@/lib/openclaw-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useOpenClawAgent,
  useOpenClawApprovals,
  useOpenClawCapabilities,
  useOpenClawConnection,
  useOpenClawFileConfig,
  useOpenClawGateway,
  useOpenClawRpc,
} from "@/hooks/openclaw"
import { cn } from "@/lib/utils"
import {
  useOpenClawConnected,
  useOpenClawConnectionStatus,
  useOpenClawSetupComplete,
  useWorkActiveAgentId,
  useWorkActiveSessionId,
  useWorkAgentSessions,
  useWorkAgents,
  useWorkDomainActions,
  useWorkDomainStore,
  useWorkExecutionMode,
  useWorkIsLoadingAgents,
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

const INVALID_SESSION_KEYS = new Set([
  "whatsapp",
  "telegram",
  "discord",
  "slack",
  "teams",
  "line",
  "email",
  "sms",
])

function isInvalidSessionKeyCandidate(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  const channelSegment = normalized.split(":")[0]
  return (
    INVALID_SESSION_KEYS.has(normalized) || INVALID_SESSION_KEYS.has(channelSegment)
  )
}

function readNestedString(
  source: Record<string, unknown>,
  path: Array<string>,
): string | undefined {
  let current: unknown = source

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === "string" && current.trim() ? current : undefined
}

function extractRemoteSessionKey(
  remote: Record<string, unknown> | null,
): string | undefined {
  if (!remote) return undefined

  const candidates = [
    ["sessionKey"],
    ["session", "sessionKey"],
    ["payload", "sessionKey"],
    ["result", "sessionKey"],
    ["sessionId"],
    ["session", "id"],
    ["payload", "sessionId"],
    ["result", "sessionId"],
    ["key"],
    ["session", "key"],
  ]

  for (const path of candidates) {
    const found = readNestedString(remote, path)
    if (!found) continue

    if (isInvalidSessionKeyCandidate(found)) {
      continue
    }

    return found
  }

  return undefined
}

function normalizeSessionKeyForAgent(agentId: string, sessionKey: string): string {
  if (sessionKey.startsWith("agent:")) return sessionKey
  if (sessionKey.includes(":")) return sessionKey
  if (sessionKey === "main" || sessionKey === "global") {
    return `agent:${agentId}:${sessionKey}`
  }
  return sessionKey
}

export function WorkDomainProvider({ children }: WorkDomainProviderProps) {
  const isConnected = useOpenClawConnected()
  const [isRestarting, setIsRestarting] = useState(false)

  const {
    removeAgent,
    addSession,
    updateSessionStatus,
    setCapabilities,
    setError,
    setGatewayHealth,
    setSetupComplete,
    setToolsCatalog,
    clearChatMessages,
  } = useWorkDomainActions()

  const { detectInstallation, refreshGatewayStatus, stopGateway, startGateway } =
    useOpenClawGateway()
  useOpenClawConnection() // Sets up event listeners for connection status
  const { loadAgents: loadOpenClawAgents } = useOpenClawAgent()
  const { approve, reject, loadApprovals } = useOpenClawApprovals()
  const { refreshCapabilities } = useOpenClawCapabilities()
  const { createSession, getHealth, listTools } = useOpenClawRpc()
  const { readFileConfig, writeFileConfig } = useOpenClawFileConfig()

  // Load agents from OpenClaw when connected
  const loadAgents = useCallback(async () => {
    await loadOpenClawAgents()

    if (!isConnected) {
      return
    }

    const [, tools, health] = await Promise.all([
      loadApprovals().then(() => undefined),
      listTools(),
      getHealth(),
    ])
    setToolsCatalog(tools)
    setGatewayHealth(health)

  }, [
    getHealth,
    isConnected,
    listTools,
    loadApprovals,
    loadOpenClawAgents,
    setGatewayHealth,
    setToolsCatalog,
  ])

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
      const [capabilities, tools, health] = await Promise.all([
        refreshCapabilities(),
        listTools(),
        getHealth(),
      ])
      setCapabilities(capabilities)
      setToolsCatalog(tools)
      setGatewayHealth(health)
    } finally {
      setIsRestarting(false)
    }
  }, [
    getHealth,
    listTools,
    loadOpenClawAgents,
    refreshCapabilities,
    setCapabilities,
    setGatewayHealth,
    setToolsCatalog,
    startGateway,
    stopGateway,
  ])

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
        const requestedTitle = title ?? "New Session"
        let sessionId = `session-${Date.now()}`

        if (isConnected) {
          const remote = await createSession(agentId, requestedTitle)
          const remoteSessionId = extractRemoteSessionKey(remote)

          if (remoteSessionId) {
            sessionId = normalizeSessionKeyForAgent(agentId, remoteSessionId)
          } else {
            // Compatible fallback used by OpenClaw webchat when no explicit session key is returned.
            sessionId = `agent:${agentId}:main`
          }
        }

        const existing = useWorkDomainStore
          .getState()
          .sessions.find((session) => session.id === sessionId && session.agentId === agentId)

        if (existing) {
          clearChatMessages()
          return existing
        }

        const newSession: Session = {
          id: sessionId,
          agentId,
          title: requestedTitle,
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
    [addSession, clearChatMessages, createSession, isConnected, setError],
  )

  const endSession = useCallback(
    (sessionId: string): Promise<boolean> => {
      try {
        updateSessionStatus(sessionId, "finished")
        return Promise.resolve(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return Promise.resolve(false)
      }
    },
    [updateSessionStatus, setError],
  )

  const approveAction = useCallback(
    (approvalId: string): Promise<boolean> => approve(approvalId),
    [approve],
  )

  const rejectAction = useCallback(
    (approvalId: string): Promise<boolean> => reject(approvalId),
    [reject],
  )

  // On mount: detect installation and gateway status
  useEffect(() => {
    const initialize = async () => {
      const [installation, gatewayStatus, capabilities] = await Promise.all([
        detectInstallation(),
        refreshGatewayStatus(),
        refreshCapabilities(),
      ])

      setCapabilities(capabilities)

      // If gateway isn't running, setup must be completed again before use.
      if (!gatewayStatus?.isRunning || !installation?.installed) {
        setSetupComplete(false)
      }
    }

    initialize()
  }, [
    detectInstallation,
    refreshCapabilities,
    refreshGatewayStatus,
    setCapabilities,
    setSetupComplete,
  ])

  // Load agents whenever connection state changes.
  // When offline, loadOpenClawAgents falls back to file config.
  useEffect(() => {
    loadAgents()
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
  const setupComplete = useOpenClawSetupComplete()
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

  const existingModelOptions = useMemo<Array<OpenClawModelOption>>(
    () =>
      Array.from(
        new Set(
          agents
            .map((agent) => agent.config.model)
            .filter((model): model is string => typeof model === "string" && !!model.trim()),
        ),
      )
        .sort((a, b) => a.localeCompare(b))
        .map((model) => ({
          value: model,
          label: model,
          provider: model.includes("/") ? model.split("/")[0] : undefined,
        })),
    [agents],
  )

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
    if (!activeAgentId || !setupComplete) return
    const session = await startSession(activeAgentId)
    if (session) {
      setActiveSessionId(session.id)
    }
  }, [activeAgentId, setActiveSessionId, setupComplete, startSession])

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
          <WorkModelField
            id="new-agent-model"
            value={newAgentModel}
            onChange={setNewAgentModel}
            options={existingModelOptions}
            placeholder="provider/model (optional)"
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
            disabled={!setupComplete}
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
            disabled={!isConnected || !setupComplete || isRestarting}
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
  return <WorkWorkspaceContent />
}

// ============================================================================
// Legacy exports for backwards compatibility
// ============================================================================

export { WorkDomainProvider as WorkTabProvider }
export { WorkSidebar as WorkTabSidebar }
export { WorkWorkspace as WorkTabWorkspace }
