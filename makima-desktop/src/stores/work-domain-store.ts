import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"
import type {
  Agent,
  Approval,
  ApprovalStatus,
  ExecutionMode,
  Run,
  RunStatus,
  Session,
  SessionStatus,
} from "@/lib/work-types"
import type {
  OpenClawInstallation,
  GatewayProcessStatus,
  WorkChatMessage,
} from "@/lib/openclaw-types"

// ============================================================================
// Work Domain Store - Agents, Sessions, Runs, Approvals
// ============================================================================

interface WorkDomainState {
  // Agents
  agents: Array<Agent>
  activeAgentId: string | null
  isLoadingAgents: boolean

  // Sessions
  sessions: Array<Session>
  activeSessionId: string | null
  isLoadingSessions: boolean

  // Runs
  runs: Array<Run>
  activeRunId: string | null

  // Approvals
  approvals: Array<Approval>

  // Mode
  executionMode: ExecutionMode

  // OpenClaw connection
  openclawConnection: {
    status: "disconnected" | "connecting" | "connected" | "error"
    gatewayVersion?: string
    error?: string
  }
  openclawInstallation: OpenClawInstallation | null
  openclawGatewayStatus: GatewayProcessStatus | null

  // Chat
  chatMessages: Array<WorkChatMessage>
  isAgentStreaming: boolean

  // General state
  error: string | null
}

interface WorkDomainActions {
  // Agents CRUD
  setAgents: (agents: Array<Agent>) => void
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Omit<Agent, "id">>) => void
  removeAgent: (id: string) => void
  setActiveAgentId: (id: string | null) => void
  setIsLoadingAgents: (loading: boolean) => void

  // Sessions CRUD
  setSessions: (sessions: Array<Session>) => void
  addSession: (session: Session) => void
  updateSession: (id: string, updates: Partial<Omit<Session, "id">>) => void
  removeSession: (id: string) => void
  setActiveSessionId: (id: string | null) => void
  setIsLoadingSessions: (loading: boolean) => void
  updateSessionStatus: (id: string, status: SessionStatus) => void

  // Runs CRUD
  setRuns: (runs: Array<Run>) => void
  addRun: (run: Run) => void
  updateRun: (id: string, updates: Partial<Omit<Run, "id">>) => void
  removeRun: (id: string) => void
  setActiveRunId: (id: string | null) => void
  updateRunStatus: (id: string, status: RunStatus) => void

  // Approvals CRUD
  setApprovals: (approvals: Array<Approval>) => void
  addApproval: (approval: Approval) => void
  updateApproval: (id: string, updates: Partial<Omit<Approval, "id">>) => void
  removeApproval: (id: string) => void
  resolveApproval: (id: string, status: ApprovalStatus) => void

  // Mode
  setExecutionMode: (mode: ExecutionMode) => void
  toggleExecutionMode: () => void

  // OpenClaw connection
  setOpenClawConnectionStatus: (
    status: WorkDomainState["openclawConnection"],
  ) => void
  setOpenClawInstallation: (installation: OpenClawInstallation | null) => void
  setOpenClawGatewayStatus: (status: GatewayProcessStatus | null) => void

  // Chat messages
  addChatMessage: (message: WorkChatMessage) => void
  updateChatMessage: (id: string, updates: Partial<WorkChatMessage>) => void
  setChatMessages: (messages: Array<WorkChatMessage>) => void
  clearChatMessages: () => void
  setIsAgentStreaming: (streaming: boolean) => void

  // Error handling
  setError: (error: string | null) => void
  clearError: () => void

  // Bulk operations
  clearSessionData: () => void
}

export type WorkDomainStore = WorkDomainState & WorkDomainActions

const initialState: WorkDomainState = {
  agents: [],
  activeAgentId: null,
  isLoadingAgents: true,
  sessions: [],
  activeSessionId: null,
  isLoadingSessions: false,
  runs: [],
  activeRunId: null,
  approvals: [],
  executionMode: "safe",
  openclawConnection: { status: "disconnected" },
  openclawInstallation: null,
  openclawGatewayStatus: null,
  chatMessages: [],
  isAgentStreaming: false,
  error: null,
}

export const useWorkDomainStore = create<WorkDomainStore>((set, get) => ({
  ...initialState,

  // ============================================================================
  // Agents
  // ============================================================================

  setAgents: (agents) => set({ agents }),

  addAgent: (agent) =>
    set((state) => ({
      agents: [agent, ...state.agents],
    })),

  updateAgent: (id, updates) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a,
      ),
    })),

  removeAgent: (id) =>
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id),
      activeAgentId: state.activeAgentId === id ? null : state.activeAgentId,
      // Also clear sessions for this agent
      sessions: state.sessions.filter((s) => s.agentId !== id),
    })),

  setActiveAgentId: (activeAgentId) => set({ activeAgentId }),

  setIsLoadingAgents: (isLoadingAgents) => set({ isLoadingAgents }),

  // ============================================================================
  // Sessions
  // ============================================================================

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [session, ...state.sessions],
    })),

  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s,
      ),
    })),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId:
        state.activeSessionId === id ? null : state.activeSessionId,
      // Also clear runs and approvals for this session
      runs: state.runs.filter((r) => r.sessionId !== id),
      approvals: state.approvals.filter((a) => a.sessionId !== id),
    })),

  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

  setIsLoadingSessions: (isLoadingSessions) => set({ isLoadingSessions }),

  updateSessionStatus: (id, status) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, status, updatedAt: Date.now() } : s,
      ),
    })),

  // ============================================================================
  // Runs
  // ============================================================================

  setRuns: (runs) => set({ runs }),

  addRun: (run) =>
    set((state) => ({
      runs: [run, ...state.runs],
    })),

  updateRun: (id, updates) =>
    set((state) => ({
      runs: state.runs.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  removeRun: (id) =>
    set((state) => ({
      runs: state.runs.filter((r) => r.id !== id),
      activeRunId: state.activeRunId === id ? null : state.activeRunId,
      // Also clear approvals for this run
      approvals: state.approvals.filter((a) => a.runId !== id),
    })),

  setActiveRunId: (activeRunId) => set({ activeRunId }),

  updateRunStatus: (id, status) =>
    set((state) => ({
      runs: state.runs.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              finishedAt:
                status === "completed" || status === "failed"
                  ? Date.now()
                  : r.finishedAt,
            }
          : r,
      ),
    })),

  // ============================================================================
  // Approvals
  // ============================================================================

  setApprovals: (approvals) => set({ approvals }),

  addApproval: (approval) =>
    set((state) => ({
      approvals: [approval, ...state.approvals],
    })),

  updateApproval: (id, updates) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === id ? { ...a, ...updates } : a,
      ),
    })),

  removeApproval: (id) =>
    set((state) => ({
      approvals: state.approvals.filter((a) => a.id !== id),
    })),

  resolveApproval: (id, status) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              resolvedAt: Date.now(),
              resolvedBy: "user" as const,
            }
          : a,
      ),
    })),

  // ============================================================================
  // Mode
  // ============================================================================

  setExecutionMode: (executionMode) => set({ executionMode }),

  toggleExecutionMode: () =>
    set((state) => ({
      executionMode: state.executionMode === "safe" ? "auto" : "safe",
    })),

  // ============================================================================
  // OpenClaw connection
  // ============================================================================

  setOpenClawConnectionStatus: (openclawConnection) =>
    set({ openclawConnection }),

  setOpenClawInstallation: (openclawInstallation) =>
    set({ openclawInstallation }),

  setOpenClawGatewayStatus: (openclawGatewayStatus) =>
    set({ openclawGatewayStatus }),

  // ============================================================================
  // Chat messages
  // ============================================================================

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  updateChatMessage: (id, updates) =>
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),

  setChatMessages: (chatMessages) => set({ chatMessages }),

  clearChatMessages: () => set({ chatMessages: [] }),

  setIsAgentStreaming: (isAgentStreaming) => set({ isAgentStreaming }),

  // ============================================================================
  // Error handling
  // ============================================================================

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // ============================================================================
  // Bulk operations
  // ============================================================================

  clearSessionData: () =>
    set({
      sessions: [],
      activeSessionId: null,
      runs: [],
      activeRunId: null,
      approvals: [],
      chatMessages: [],
      isAgentStreaming: false,
    }),
}))

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// Agent selectors
export const useWorkAgents = () => useWorkDomainStore((s) => s.agents)

export const useWorkAgentsCount = () =>
  useWorkDomainStore((s) => s.agents.length)

export const useWorkActiveAgentId = () =>
  useWorkDomainStore((s) => s.activeAgentId)

export const useWorkActiveAgent = () =>
  useWorkDomainStore((s) =>
    s.agents.find((a) => a.id === s.activeAgentId),
  )

export const useWorkIsLoadingAgents = () =>
  useWorkDomainStore((s) => s.isLoadingAgents)

// Session selectors
export const useWorkSessions = () => useWorkDomainStore((s) => s.sessions)

export const useWorkSessionsCount = () =>
  useWorkDomainStore((s) => s.sessions.length)

export const useWorkActiveSessionId = () =>
  useWorkDomainStore((s) => s.activeSessionId)

export const useWorkActiveSession = () =>
  useWorkDomainStore((s) =>
    s.sessions.find((sess) => sess.id === s.activeSessionId),
  )

export const useWorkIsLoadingSessions = () =>
  useWorkDomainStore((s) => s.isLoadingSessions)

// Sessions for active agent
export const useWorkAgentSessions = () =>
  useWorkDomainStore(
    useShallow((s) =>
      s.sessions.filter((sess) => sess.agentId === s.activeAgentId),
    ),
  )

// Run selectors
export const useWorkRuns = () => useWorkDomainStore((s) => s.runs)

export const useWorkRunsCount = () => useWorkDomainStore((s) => s.runs.length)

export const useWorkActiveRunId = () =>
  useWorkDomainStore((s) => s.activeRunId)

export const useWorkActiveRun = () =>
  useWorkDomainStore((s) => s.runs.find((r) => r.id === s.activeRunId))

// Runs for active session
export const useWorkSessionRuns = () =>
  useWorkDomainStore(
    useShallow((s) => s.runs.filter((r) => r.sessionId === s.activeSessionId)),
  )

// Running runs
export const useWorkRunningRuns = () =>
  useWorkDomainStore(
    useShallow((s) => s.runs.filter((r) => r.status === "running")),
  )

export const useWorkHasRunningRuns = () =>
  useWorkDomainStore((s) => s.runs.some((r) => r.status === "running"))

// Approval selectors
export const useWorkApprovals = () => useWorkDomainStore((s) => s.approvals)

export const useWorkApprovalsCount = () =>
  useWorkDomainStore((s) => s.approvals.length)

export const useWorkPendingApprovals = () =>
  useWorkDomainStore(
    useShallow((s) => s.approvals.filter((a) => a.status === "pending")),
  )

export const useWorkPendingApprovalsCount = () =>
  useWorkDomainStore((s) => s.approvals.filter((a) => a.status === "pending").length)

export const useWorkHasPendingApprovals = () =>
  useWorkDomainStore((s) => s.approvals.some((a) => a.status === "pending"))

// Mode selectors
export const useWorkExecutionMode = () =>
  useWorkDomainStore((s) => s.executionMode)

export const useWorkIsSafeMode = () =>
  useWorkDomainStore((s) => s.executionMode === "safe")

export const useWorkIsAutoMode = () =>
  useWorkDomainStore((s) => s.executionMode === "auto")

// OpenClaw connection selectors
export const useOpenClawConnectionStatus = () =>
  useWorkDomainStore(
    useShallow((s) => s.openclawConnection),
  )

export const useOpenClawConnected = () =>
  useWorkDomainStore((s) => s.openclawConnection.status === "connected")

export const useOpenClawInstallation = () =>
  useWorkDomainStore((s) => s.openclawInstallation)

export const useOpenClawGatewayStatus = () =>
  useWorkDomainStore((s) => s.openclawGatewayStatus)

// Chat selectors
export const useWorkChatMessages = () =>
  useWorkDomainStore((s) => s.chatMessages)

export const useWorkIsAgentStreaming = () =>
  useWorkDomainStore((s) => s.isAgentStreaming)

// Error selectors
export const useWorkError = () => useWorkDomainStore((s) => s.error)

// Actions selector (stable reference with useShallow)
export const useWorkDomainActions = () =>
  useWorkDomainStore(
    useShallow((s) => ({
      // Agents
      setAgents: s.setAgents,
      addAgent: s.addAgent,
      updateAgent: s.updateAgent,
      removeAgent: s.removeAgent,
      setActiveAgentId: s.setActiveAgentId,
      setIsLoadingAgents: s.setIsLoadingAgents,
      // Sessions
      setSessions: s.setSessions,
      addSession: s.addSession,
      updateSession: s.updateSession,
      removeSession: s.removeSession,
      setActiveSessionId: s.setActiveSessionId,
      setIsLoadingSessions: s.setIsLoadingSessions,
      updateSessionStatus: s.updateSessionStatus,
      // Runs
      setRuns: s.setRuns,
      addRun: s.addRun,
      updateRun: s.updateRun,
      removeRun: s.removeRun,
      setActiveRunId: s.setActiveRunId,
      updateRunStatus: s.updateRunStatus,
      // Approvals
      setApprovals: s.setApprovals,
      addApproval: s.addApproval,
      updateApproval: s.updateApproval,
      removeApproval: s.removeApproval,
      resolveApproval: s.resolveApproval,
      // Mode
      setExecutionMode: s.setExecutionMode,
      toggleExecutionMode: s.toggleExecutionMode,
      // OpenClaw
      setOpenClawConnectionStatus: s.setOpenClawConnectionStatus,
      setOpenClawInstallation: s.setOpenClawInstallation,
      setOpenClawGatewayStatus: s.setOpenClawGatewayStatus,
      // Chat
      addChatMessage: s.addChatMessage,
      updateChatMessage: s.updateChatMessage,
      setChatMessages: s.setChatMessages,
      clearChatMessages: s.clearChatMessages,
      setIsAgentStreaming: s.setIsAgentStreaming,
      // Error
      setError: s.setError,
      clearError: s.clearError,
      // Bulk
      clearSessionData: s.clearSessionData,
    })),
  )
