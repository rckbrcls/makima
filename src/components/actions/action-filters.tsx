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
import type { Agent, ActionStatus, ActionType } from "@/components/agents/types"

export interface ActionFilters {
  agentId: string | null
  status: ActionStatus | null
  actionType: ActionType | null
}

interface ActionFiltersProps {
  filters: ActionFilters
  onFiltersChange: (filters: ActionFilters) => void
  agents: Agent[]
}

const actionTypes: { value: ActionType; label: string }[] = [
  { value: "run_command", label: "Run Command" },
  { value: "read_file", label: "Read File" },
  { value: "write_file", label: "Write File" },
  { value: "edit_file", label: "Edit File" },
  { value: "list_files", label: "List Files" },
  { value: "delete_file", label: "Delete File" },
  { value: "git_status", label: "Git Status" },
  { value: "git_diff", label: "Git Diff" },
  { value: "git_commit", label: "Git Commit" },
  { value: "git_checkout", label: "Git Checkout" },
  { value: "search_web", label: "Search Web" },
  { value: "open_url", label: "Open URL" },
  { value: "notify", label: "Notify" },
  { value: "sleep", label: "Sleep" },
]

export function ActionFiltersBar({
  filters,
  onFiltersChange,
  agents,
}: ActionFiltersProps) {
  const hasFilters = filters.agentId || filters.status || filters.actionType

  const clearFilters = () => {
    onFiltersChange({ agentId: null, status: null, actionType: null })
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

      {/* Status Filter */}
      <Select
        value={filters.status ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value === "all" ? null : (value as ActionStatus),
          })
        }
      >
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="All status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="running">Running</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {/* Action Type Filter */}
      <Select
        value={filters.actionType ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            actionType: value === "all" ? null : (value as ActionType),
          })
        }
      >
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {actionTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
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
          {filters.status && (
            <Badge variant="secondary" className="text-[0.65rem]">
              Status: {filters.status}
            </Badge>
          )}
          {filters.actionType && (
            <Badge variant="secondary" className="text-[0.65rem]">
              Type: {actionTypes.find((t) => t.value === filters.actionType)?.label}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
