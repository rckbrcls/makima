import { useState } from "react"
import { Card } from "@/components/ui/card"
import { useAgentState } from "@/hooks/use-agent-state"
import { useUIStore } from "@/stores/ui-store"
import { PageHeader } from "@/components/shared/page-header"
import { ActionTimeline } from "@/components/actions/action-timeline"
import type { ActionFilters } from "@/components/actions/action-filters"
import type { Action } from "@/components/agents/types"
import { mockActions } from "@/mocks"

export function ActionsPage() {
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
  const [filters, setFilters] = useState<ActionFilters>({
    agentId: null,
    status: null,
    actionType: null,
  })

  const handleToggleMode = async () => {
    return toggleMode()
  }

  const handleRefresh = () => {
    refreshAgentState()
  }

  const handleActionClick = (action: Action) => {
    // TODO: Open action details panel
    console.log("Action clicked:", action.id)
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
          searchPlaceholder="Search actions..."
        />

        {/* Body */}
        <Card className="min-h-0 flex-1 overflow-hidden border-border/70 bg-card p-4">
          <div className="h-full overflow-y-auto">
            <ActionTimeline
              actions={mockActions}
              sessions={sessions}
              agents={agents}
              filters={filters}
              onFiltersChange={setFilters}
              onActionClick={handleActionClick}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
