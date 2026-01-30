import { useMemo } from "react"
import { Activity } from "lucide-react"
import type { Action, Agent, Session } from "@/components/agents/types"
import { ActionCard } from "./action-card"
import { ActionFiltersBar, type ActionFilters } from "./action-filters"

interface ActionTimelineProps {
  actions: Action[]
  sessions: Session[]
  agents: Agent[]
  filters: ActionFilters
  onFiltersChange: (filters: ActionFilters) => void
  onActionClick?: (action: Action) => void
}

export function ActionTimeline({
  actions,
  sessions,
  agents,
  filters,
  onFiltersChange,
  onActionClick,
}: ActionTimelineProps) {
  // Build session-to-agent mapping
  const sessionAgentMap = useMemo(() => {
    const map = new Map<string, string>()
    sessions.forEach((session) => {
      map.set(session.id, session.agentId)
    })
    return map
  }, [sessions])

  // Filter actions based on current filters
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      // Filter by agent (via session)
      if (filters.agentId) {
        const agentId = sessionAgentMap.get(action.sessionId)
        if (agentId !== filters.agentId) {
          return false
        }
      }

      // Filter by status
      if (filters.status && action.status !== filters.status) {
        return false
      }

      // Filter by action type
      if (filters.actionType && action.actionType !== filters.actionType) {
        return false
      }

      return true
    })
  }, [actions, filters, sessionAgentMap])

  // Sort actions by createdAt (most recent first)
  const sortedActions = useMemo(() => {
    return [...filteredActions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [filteredActions])

  // Get session and agent for each action
  const getSessionForAction = (action: Action) => {
    return sessions.find((s) => s.id === action.sessionId)
  }

  const getAgentNameForAction = (action: Action) => {
    const agentId = sessionAgentMap.get(action.sessionId)
    return agents.find((a) => a.id === agentId)?.name
  }

  return (
    <div className="space-y-4 p-1">
      {/* Filters */}
      <ActionFiltersBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        agents={agents}
      />

      {/* Action Count */}
      <div className="text-xs text-muted-foreground">
        Showing {sortedActions.length} of {actions.length} action(s)
      </div>

      {/* Actions Timeline */}
      {sortedActions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="size-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No actions found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {actions.length > 0
              ? "Try adjusting your filters"
              : "Actions will appear here as agents execute tasks"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              session={getSessionForAction(action)}
              agentName={getAgentNameForAction(action)}
              onClick={onActionClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
