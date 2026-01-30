import { useMemo } from "react"
import { ListChecks } from "lucide-react"
import type { Agent, Session, Action } from "@/components/agents/types"
import { SessionCard } from "./session-card"
import { SessionFiltersBar, type SessionFilters } from "./session-filters"

interface SessionListProps {
  sessions: Session[]
  agents: Agent[]
  actions: Action[]
  filters: SessionFilters
  onFiltersChange: (filters: SessionFilters) => void
  onSessionClick?: (session: Session) => void
}

export function SessionList({
  sessions,
  agents,
  actions,
  filters,
  onFiltersChange,
  onSessionClick,
}: SessionListProps) {
  // Filter sessions based on current filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (filters.agentId && session.agentId !== filters.agentId) {
        return false
      }
      if (filters.state && session.state !== filters.state) {
        return false
      }
      return true
    })
  }, [sessions, filters])

  // Get agent for each session
  const getAgentForSession = (session: Session) => {
    return agents.find((a) => a.id === session.agentId)
  }

  // Get action count for each session
  const getActionCountForSession = (sessionId: string) => {
    return actions.filter((a) => a.sessionId === sessionId).length
  }

  return (
    <div className="space-y-4 p-1">
      {/* Filters */}
      <SessionFiltersBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        agents={agents}
      />

      {/* Session Count */}
      <div className="text-xs text-muted-foreground">
        Showing {filteredSessions.length} of {sessions.length} session(s)
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ListChecks className="size-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No sessions found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {sessions.length > 0
              ? "Try adjusting your filters"
              : "Start a session with an agent to see it here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              agent={getAgentForSession(session)}
              actionCount={getActionCountForSession(session.id)}
              onClick={onSessionClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
