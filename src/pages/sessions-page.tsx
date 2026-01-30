import { useState } from "react"
import { Card } from "@/components/ui/card"
import { useAgentState } from "@/hooks/use-agent-state"
import { useUIStore } from "@/stores/ui-store"
import { PageHeader } from "@/components/shared/page-header"
import { SessionList } from "@/components/sessions/session-list"
import type { SessionFilters } from "@/components/sessions/session-filters"
import type { Session } from "@/components/agents/types"
import { mockActions } from "@/mocks"

export function SessionsPage() {
  const {
    mode,
    agents,
    sessions,
    pendingApprovals,
    refreshState: refreshAgentState,
    toggleMode,
  } = useAgentState()

  const { openApprovalDrawer } = useUIStore()

  // Filter state
  const [filters, setFilters] = useState<SessionFilters>({
    agentId: null,
    state: null,
  })

  const handleToggleMode = async () => {
    return toggleMode()
  }

  const handleRefresh = () => {
    refreshAgentState()
  }

  const handleSessionClick = (session: Session) => {
    // TODO: Navigate to session details or open session panel
    console.log("Session clicked:", session.id)
  }

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">
      {/* Grid Background */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,var(--grid-line)_1px,transparent_1px),linear-gradient(0deg,var(--grid-line)_1px,transparent_1px)] [background-size:44px_44px]" />

      {/* Draggable Top Spacer */}
      <div className="h-10 w-full shrink-0 z-50" data-tauri-drag-region />

      <div className="relative mx-auto grid mt-10 min-h-0 flex-1 w-full grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 pb-4 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHeader
          mode={mode}
          pendingCount={pendingApprovals.length}
          onToggleMode={handleToggleMode}
          onOpenApprovals={openApprovalDrawer}
          onRefresh={handleRefresh}
          searchPlaceholder="Search sessions..."
        />

        {/* Body */}
        <Card className="min-h-0 flex-1 overflow-hidden border-border/70 bg-card p-4">
          <div className="h-full overflow-y-auto">
            <SessionList
              sessions={sessions}
              agents={agents}
              actions={mockActions}
              filters={filters}
              onFiltersChange={setFilters}
              onSessionClick={handleSessionClick}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
