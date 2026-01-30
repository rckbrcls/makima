import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, X } from "lucide-react"
import type { Agent, SessionState } from "@/components/agents/types"

export interface SessionFilters {
  agentId: string | null
  state: SessionState | null
}

interface SessionFiltersProps {
  filters: SessionFilters
  onFiltersChange: (filters: SessionFilters) => void
  agents: Agent[]
}

export function SessionFiltersBar({
  filters,
  onFiltersChange,
  agents,
}: SessionFiltersProps) {
  const hasFilters = filters.agentId || filters.state

  const clearFilters = () => {
    onFiltersChange({ agentId: null, state: null })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="size-4" />
        <span className="text-xs font-medium">Filters:</span>
      </div>

      {/* Agent Filter */}
      <Select
        value={filters.agentId ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            agentId: value === "all" ? null : value,
          })
        }
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="All agents" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All agents</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* State Filter */}
      <Select
        value={filters.state ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            state: value === "all" ? null : (value as SessionState),
          })
        }
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="All states" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={clearFilters}
        >
          <X className="size-3" />
          Clear
        </Button>
      )}

      {/* Active Filter Badges */}
      {hasFilters && (
        <div className="flex items-center gap-1">
          {filters.agentId && (
            <Badge variant="secondary" className="text-[0.65rem]">
              Agent: {agents.find((a) => a.id === filters.agentId)?.name}
            </Badge>
          )}
          {filters.state && (
            <Badge variant="secondary" className="text-[0.65rem]">
              State: {filters.state}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
