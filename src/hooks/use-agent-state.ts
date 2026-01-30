import { useCallback, useState } from 'react'
import { toast } from '@/components/ui/sonner'
import type {
  Agent,
  AgentDashboardState,
  Approval,
  BridgeMode,
  CreateAgentRequest,
  StartSessionRequest,
  Session,
  Action,
  AgentEvent,
} from '@/components/agents/types'
import {
  mockAgentDashboard,
  mockEvents,
  mockActions,
  mockSessions,
} from '@/mocks'

// ============================================================================
// Helpers
// ============================================================================

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentState() {
  const [state, setState] = useState<AgentDashboardState>(mockAgentDashboard)
  const [isLoading, setIsLoading] = useState(false)

  // Simulation of state refresh
  const refreshState = useCallback(async () => {
    console.log('Refreshing agent state (mock)...')
  }, [])

  // --------------------------------------------------------------------------
  // Agent Management
  // --------------------------------------------------------------------------

  const createAgent = useCallback(async (request: CreateAgentRequest) => {
    const toastId = toast.loading('Creating agent...', {
      description: request.name,
    })

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: request.name,
        provider: request.provider,
        model: request.model,
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setState((prev) => ({
        ...prev,
        agents: [...prev.agents, { ...newAgent, repos: request.repos }],
      }))

      toast.success('Agent created', {
        id: toastId,
        description: newAgent.name,
      })
      return newAgent
    } catch (error) {
      toast.error('Failed to create agent', {
        id: toastId,
        description: getErrorMessage(error),
      })
      return null
    }
  }, [])

  const deleteAgent = useCallback(async (agentId: string) => {
    const toastId = toast.loading('Deleting agent...')

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setState((prev) => ({
        ...prev,
        agents: prev.agents.filter((a) => a.id !== agentId),
      }))

      toast.success('Agent deleted', { id: toastId })
      return true
    } catch (error) {
      toast.error('Failed to delete agent', {
        id: toastId,
        description: getErrorMessage(error),
      })
      return false
    }
  }, [])

  const getAgent = useCallback(
    async (agentId: string) => {
      // Mock implementation
      return state.agents.find((a) => a.id === agentId) || null
    },
    [state.agents],
  )

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  const startSession = useCallback(async (request: StartSessionRequest) => {
    const toastId = toast.loading('Starting session...', {
      description: request.goal ?? 'New session',
    })

    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      const newSession: Session = {
        id: `session-${Date.now()}`,
        agentId: request.agentId,
        goal: request.goal,
        state: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setState((prev) => {
        // Update global sessions
        const nextSessions = [...prev.sessions, newSession]

        // Update agent's current session
        const nextAgents = prev.agents.map((a) => {
          if (a.id === request.agentId) {
            return {
              ...a,
              currentSession: newSession,
              status: 'running' as const,
            }
          }
          return a
        })

        return {
          ...prev,
          agents: nextAgents,
          sessions: nextSessions,
        }
      })

      toast.success('Session started', {
        id: toastId,
        description: request.goal ?? `Session ${newSession.id.slice(0, 8)}`,
      })
      return newSession
    } catch (error) {
      toast.error('Failed to start session', {
        id: toastId,
        description: getErrorMessage(error),
      })
      return null
    }
  }, [])

  const endSession = useCallback(
    async (sessionId: string, success: boolean) => {
      const toastId = toast.loading('Ending session...')

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        setState((prev) => {
          // Update session status
          const nextSessions = prev.sessions.map((s) => {
            if (s.id === sessionId) {
              return { ...s, state: success ? 'done' : 'failed' } as Session
            }
            return s
          })

          // Update agent status if this was their current session
          const nextAgents = prev.agents.map((a) => {
            if (a.currentSession?.id === sessionId) {
              return {
                ...a,
                currentSession: undefined,
                status: 'idle' as const,
              }
            }
            return a
          })

          return {
            ...prev,
            sessions: nextSessions,
            agents: nextAgents,
          }
        })

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
    [],
  )

  const getSession = useCallback(
    async (sessionId: string) => {
      return state.sessions.find((s) => s.id === sessionId) || null
    },
    [state.sessions],
  )

  const getSessionsForAgent = useCallback(
    async (agentId: string) => {
      return state.sessions.filter((s) => s.agentId === agentId)
    },
    [state.sessions],
  )

  // --------------------------------------------------------------------------
  // Action & Event Queries
  // --------------------------------------------------------------------------

  const getActionsForSession = useCallback(async (sessionId: string) => {
    // For mocks, we'll return static mock actions filtered by session
    // In a real mock, we'd probably want to store these in state too if we're creating new ones
    return mockActions.filter((a) => a.sessionId === sessionId)
  }, [])

  const getEventsForSession = useCallback(async (sessionId: string) => {
    return mockEvents.filter((e) => e.sessionId === sessionId)
  }, [])

  // --------------------------------------------------------------------------
  // Approval Management
  // --------------------------------------------------------------------------

  const approveAction = useCallback(
    async (approvalId: string, reviewer: string, reason?: string) => {
      const toastId = toast.loading('Approving action...')

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        setState((prev) => {
          // Remove from pending approvals
          const nextPending = prev.pendingApprovals.filter(
            (ap) => ap.id !== approvalId,
          )

          // Ideally update action status too, but that's deep in mocks
          // For UI purposes, removing from pending list is enough

          return {
            ...prev,
            pendingApprovals: nextPending,
          }
        })

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
    [],
  )

  const rejectAction = useCallback(
    async (approvalId: string, reviewer: string, reason?: string) => {
      const toastId = toast.loading('Rejecting action...')

      try {
        await new Promise((resolve) => setTimeout(resolve, 500))

        setState((prev) => {
          const nextPending = prev.pendingApprovals.filter(
            (ap) => ap.id !== approvalId,
          )

          return {
            ...prev,
            pendingApprovals: nextPending,
          }
        })

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
    [],
  )

  const approveAllPending = useCallback(
    async (sessionId: string, reviewer: string) => {
      const toastId = toast.loading('Approving all pending actions...')

      try {
        await new Promise((resolve) => setTimeout(resolve, 800))

        let count = 0
        setState((prev) => {
          const toRemove = prev.pendingApprovals.filter(
            (ap) => ap.action?.sessionId === sessionId,
          )
          count = toRemove.length

          const nextPending = prev.pendingApprovals.filter(
            (ap) => ap.action?.sessionId !== sessionId,
          )

          return {
            ...prev,
            pendingApprovals: nextPending,
          }
        })

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
    [],
  )

  const rejectAllPending = useCallback(
    async (sessionId: string, reviewer: string, reason?: string) => {
      const toastId = toast.loading('Rejecting all pending actions...')

      try {
        await new Promise((resolve) => setTimeout(resolve, 800))

        let count = 0
        setState((prev) => {
          const toRemove = prev.pendingApprovals.filter(
            (ap) => ap.action?.sessionId === sessionId,
          )
          count = toRemove.length

          const nextPending = prev.pendingApprovals.filter(
            (ap) => ap.action?.sessionId !== sessionId,
          )

          return {
            ...prev,
            pendingApprovals: nextPending,
          }
        })

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
    [],
  )

  const getPendingCount = useCallback(async () => {
    return state.pendingApprovals.length
  }, [state])

  const getPendingForSession = useCallback(
    async (sessionId: string) => {
      // Return approvals filtered by session (mock)
      // Needs access to full list, but we only have pending in state
      return state.pendingApprovals.filter(
        (ap) => ap.action?.sessionId === sessionId,
      ) as Approval[]
    },
    [state],
  )

  // --------------------------------------------------------------------------
  // Mode Management
  // --------------------------------------------------------------------------

  const getMode = useCallback(async () => {
    return state.globalMode
  }, [state])

  const setMode = useCallback(async (mode: BridgeMode) => {
    const toastId = toast.loading(`Switching to ${mode} mode...`)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      setState((prev) => ({ ...prev, globalMode: mode }))
      toast.success(`Mode set to ${mode}`, { id: toastId })
      return true
    } catch (error) {
      toast.error('Failed to set mode', {
        id: toastId,
        description: getErrorMessage(error),
      })
      return false
    }
  }, [])

  const toggleMode = useCallback(async () => {
    const toastId = toast.loading('Toggling mode...')

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      let newMode: BridgeMode = 'safe'

      setState((prev) => {
        newMode = prev.globalMode === 'safe' ? 'auto' : 'safe'
        return { ...prev, globalMode: newMode }
      })

      toast.success(`Mode set to ${newMode}`, { id: toastId })
      return newMode
    } catch (error) {
      toast.error('Failed to toggle mode', {
        id: toastId,
        description: getErrorMessage(error),
      })
      return null
    }
  }, [])

  return {
    state,
    isLoading,
    mode: state.globalMode,
    agents: state.agents,
    sessions: state.sessions,
    pendingApprovals: state.pendingApprovals,

    refreshState,
    createAgent,
    deleteAgent,
    getAgent,
    startSession,
    endSession,
    getSession,
    getSessionsForAgent,
    getActionsForSession,
    getEventsForSession,
    approveAction,
    rejectAction,
    approveAllPending,
    rejectAllPending,
    getPendingCount,
    getPendingForSession,
    getMode,
    setMode,
    toggleMode,
  }
}
