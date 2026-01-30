import { useCallback, useEffect, useState } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { toast } from '@/components/ui/sonner'
import type {
  Agent,
  AgentDashboardState,
  Approval,
  ApprovalRequestedEvent,
  ApprovalResolvedEvent,
  ActionFinishedEvent,
  ModeChangedEvent,
  BridgeMode,
  CreateAgentRequest,
  StartSessionRequest,
  Session,
  Action,
  AgentEvent,
} from '@/components/agent-hub/types'

// ============================================================================
// Constants
// ============================================================================

const emptyState: AgentDashboardState = {
  agents: [],
  sessions: [],
  pendingApprovals: [],
  recentEvents: [],
  globalMode: 'safe',
}

// ============================================================================
// Helpers
// ============================================================================

const isTauriAvailable = () => {
  try {
    return isTauri()
  } catch {
    return false
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentState() {
  const [state, setState] = useState<AgentDashboardState>(emptyState)
  const [isLoading, setIsLoading] = useState(true)

  // --------------------------------------------------------------------------
  // Refresh State
  // --------------------------------------------------------------------------

  const refreshState = useCallback(async () => {
    if (!isTauriAvailable()) return
    try {
      const next = await invoke<AgentDashboardState>('agent_state')
      setState(next)
    } catch (error) {
      console.error('[agent] failed to refresh state', error)
    }
  }, [])

  // --------------------------------------------------------------------------
  // Agent Management
  // --------------------------------------------------------------------------

  const createAgent = useCallback(
    async (request: CreateAgentRequest) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return null
      }

      const toastId = toast.loading('Creating agent...', {
        description: request.name,
      })

      try {
        const agent = await invoke<Agent>('agent_create', { request })
        await refreshState()
        toast.success('Agent created', {
          id: toastId,
          description: agent.name,
        })
        return agent
      } catch (error) {
        toast.error('Failed to create agent', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return null
      }
    },
    [refreshState],
  )

  const deleteAgent = useCallback(
    async (agentId: string) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return false
      }

      const toastId = toast.loading('Deleting agent...')

      try {
        await invoke('agent_delete', { agentId })
        await refreshState()
        toast.success('Agent deleted', { id: toastId })
        return true
      } catch (error) {
        toast.error('Failed to delete agent', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState],
  )

  const getAgent = useCallback(async (agentId: string) => {
    if (!isTauriAvailable()) return null
    try {
      return await invoke<Agent | null>('agent_get', { agentId })
    } catch (error) {
      console.error('[agent] failed to get agent', error)
      return null
    }
  }, [])

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  const startSession = useCallback(
    async (request: StartSessionRequest) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return null
      }

      const toastId = toast.loading('Starting session...', {
        description: request.goal ?? 'New session',
      })

      try {
        const session = await invoke<Session>('session_start', { request })
        await refreshState()
        toast.success('Session started', {
          id: toastId,
          description: request.goal ?? `Session ${session.id.slice(0, 8)}`,
        })
        return session
      } catch (error) {
        toast.error('Failed to start session', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return null
      }
    },
    [refreshState],
  )

  const endSession = useCallback(
    async (sessionId: string, success: boolean) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return false
      }

      const toastId = toast.loading('Ending session...')

      try {
        await invoke('session_end', { sessionId, success })
        await refreshState()
        toast.success(success ? 'Session completed' : 'Session failed', {
          id: toastId,
        })
        return true
      } catch (error) {
        toast.error('Failed to end session', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState],
  )

  const getSession = useCallback(async (sessionId: string) => {
    if (!isTauriAvailable()) return null
    try {
      return await invoke<Session | null>('session_get', { sessionId })
    } catch (error) {
      console.error('[agent] failed to get session', error)
      return null
    }
  }, [])

  const getSessionsForAgent = useCallback(async (agentId: string) => {
    if (!isTauriAvailable()) return []
    try {
      return await invoke<Session[]>('session_list_by_agent', { agentId })
    } catch (error) {
      console.error('[agent] failed to get sessions', error)
      return []
    }
  }, [])

  // --------------------------------------------------------------------------
  // Action & Event Queries
  // --------------------------------------------------------------------------

  const getActionsForSession = useCallback(async (sessionId: string) => {
    if (!isTauriAvailable()) return []
    try {
      return await invoke<Action[]>('action_list_by_session', { sessionId })
    } catch (error) {
      console.error('[agent] failed to get actions', error)
      return []
    }
  }, [])

  const getEventsForSession = useCallback(async (sessionId: string) => {
    if (!isTauriAvailable()) return []
    try {
      return await invoke<AgentEvent[]>('event_list_by_session', { sessionId })
    } catch (error) {
      console.error('[agent] failed to get events', error)
      return []
    }
  }, [])

  // --------------------------------------------------------------------------
  // Approval Management
  // --------------------------------------------------------------------------

  const approveAction = useCallback(
    async (approvalId: string, reviewer: string, reason?: string) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return false
      }

      const toastId = toast.loading('Approving action...')

      try {
        await invoke('approval_approve_v2', {
          approvalId,
          reviewer,
          reason,
        })
        await refreshState()
        toast.success('Action approved', { id: toastId })
        return true
      } catch (error) {
        toast.error('Failed to approve action', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState],
  )

  const rejectAction = useCallback(
    async (approvalId: string, reviewer: string, reason?: string) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return false
      }

      const toastId = toast.loading('Rejecting action...')

      try {
        await invoke('approval_reject_v2', {
          approvalId,
          reviewer,
          reason,
        })
        await refreshState()
        toast.success('Action rejected', { id: toastId })
        return true
      } catch (error) {
        toast.error('Failed to reject action', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState],
  )

  const approveAllPending = useCallback(
    async (sessionId: string, reviewer: string) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return 0
      }

      const toastId = toast.loading('Approving all pending actions...')

      try {
        const count = await invoke<number>('approval_approve_all', {
          sessionId,
          reviewer,
        })
        await refreshState()
        toast.success(`Approved ${count} action(s)`, { id: toastId })
        return count
      } catch (error) {
        toast.error('Failed to approve actions', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return 0
      }
    },
    [refreshState],
  )

  const rejectAllPending = useCallback(
    async (sessionId: string, reviewer: string, reason?: string) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return 0
      }

      const toastId = toast.loading('Rejecting all pending actions...')

      try {
        const count = await invoke<number>('approval_reject_all', {
          sessionId,
          reviewer,
          reason,
        })
        await refreshState()
        toast.success(`Rejected ${count} action(s)`, { id: toastId })
        return count
      } catch (error) {
        toast.error('Failed to reject actions', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return 0
      }
    },
    [refreshState],
  )

  const getPendingCount = useCallback(async () => {
    if (!isTauriAvailable()) return 0
    try {
      return await invoke<number>('approval_pending_count')
    } catch (error) {
      console.error('[agent] failed to get pending count', error)
      return 0
    }
  }, [])

  const getPendingForSession = useCallback(async (sessionId: string) => {
    if (!isTauriAvailable()) return []
    try {
      return await invoke<Approval[]>('approval_pending_for_session', {
        sessionId,
      })
    } catch (error) {
      console.error('[agent] failed to get pending approvals', error)
      return []
    }
  }, [])

  // --------------------------------------------------------------------------
  // Mode Management
  // --------------------------------------------------------------------------

  const getMode = useCallback(async () => {
    if (!isTauriAvailable()) return 'safe' as BridgeMode
    try {
      return await invoke<BridgeMode>('mode_get_v2')
    } catch (error) {
      console.error('[agent] failed to get mode', error)
      return 'safe' as BridgeMode
    }
  }, [])

  const setMode = useCallback(
    async (mode: BridgeMode) => {
      if (!isTauriAvailable()) {
        toast.error('Backend unavailable')
        return false
      }

      const toastId = toast.loading(`Switching to ${mode} mode...`)

      try {
        await invoke('mode_set_v2', { mode })
        await refreshState()
        toast.success(`Mode set to ${mode}`, { id: toastId })
        return true
      } catch (error) {
        toast.error('Failed to set mode', {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState],
  )

  const toggleMode = useCallback(async () => {
    if (!isTauriAvailable()) {
      toast.error('Backend unavailable')
      return null
    }

    const toastId = toast.loading('Toggling mode...')

    try {
      const newMode = await invoke<BridgeMode>('mode_toggle')
      await refreshState()
      toast.success(`Mode set to ${newMode}`, { id: toastId })
      return newMode
    } catch (error) {
      toast.error('Failed to toggle mode', {
        id: toastId,
        description: getErrorMessage(error),
      })
      return null
    }
  }, [refreshState])

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  useEffect(() => {
    let active = true
    const unlisteners: UnlistenFn[] = []

    const setup = async () => {
      if (!isTauriAvailable()) {
        setIsLoading(false)
        return
      }

      try {
        const initial = await invoke<AgentDashboardState>('agent_state')
        if (!active) return
        setState(initial)
        setIsLoading(false)

        // Listen for approval requests
        unlisteners.push(
          await listen<ApprovalRequestedEvent>(
            'approval://requested',
            (event) => {
              const { actionType, summary } = event.payload
              toast.info('Approval Required', {
                description: summary ?? `Action: ${actionType}`,
                duration: 10000,
              })
              void refreshState()
            },
          ),
        )

        // Listen for approval resolutions
        unlisteners.push(
          await listen<ApprovalResolvedEvent>('approval://resolved', () => {
            void refreshState()
          }),
        )

        // Listen for action completions
        unlisteners.push(
          await listen<ActionFinishedEvent>('action://finished', (event) => {
            const { status } = event.payload
            if (status === 'failed') {
              toast.error('Action failed')
            }
            void refreshState()
          }),
        )

        // Listen for mode changes
        unlisteners.push(
          await listen<ModeChangedEvent>('mode://changed', (event) => {
            const { mode } = event.payload
            setState((prev) => ({ ...prev, globalMode: mode }))
          }),
        )
      } catch (error) {
        if (!active) return
        console.warn('[agent] failed to connect to backend', error)
        setIsLoading(false)
      }
    }

    void setup()

    return () => {
      active = false
      unlisteners.forEach((unlisten) => unlisten())
    }
  }, [refreshState])

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------

  return {
    // State
    state,
    isLoading,
    mode: state.globalMode,
    agents: state.agents,
    sessions: state.sessions,
    pendingApprovals: state.pendingApprovals,

    // Actions
    refreshState,

    // Agent Management
    createAgent,
    deleteAgent,
    getAgent,

    // Session Management
    startSession,
    endSession,
    getSession,
    getSessionsForAgent,

    // Action & Event Queries
    getActionsForSession,
    getEventsForSession,

    // Approval Management
    approveAction,
    rejectAction,
    approveAllPending,
    rejectAllPending,
    getPendingCount,
    getPendingForSession,

    // Mode Management
    getMode,
    setMode,
    toggleMode,
  }
}
