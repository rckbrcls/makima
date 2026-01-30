import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  Check,
  CheckCheck,
  X,
  XCircle,
  Shield,
  Zap,
  FileCode,
  Terminal,
  Folder,
  Globe,
  GitBranch,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Action,
  ActionType,
  Approval,
  ApprovalCardData,
  BridgeMode,
} from "./types"
import { getActionRisk, getActionTypeLabel, getStatusColor } from "./types"

// ============================================================================
// Action Type Icons
// ============================================================================

const actionTypeIcons: Record<ActionType, typeof Terminal> = {
  run_command: Terminal,
  start_dev_server: Zap,
  stop_dev_server: XCircle,
  read_file: FileCode,
  write_file: FileCode,
  edit_file: FileCode,
  list_files: Folder,
  delete_file: XCircle,
  search_web: Globe,
  open_url: Globe,
  git_status: GitBranch,
  git_diff: GitBranch,
  git_checkout: GitBranch,
  git_commit: GitBranch,
  notify: AlertTriangle,
  sleep: AlertTriangle,
}

// ============================================================================
// Approval Card
// ============================================================================

interface ApprovalItemProps {
  data: ApprovalCardData
  onApprove: (approvalId: string) => void
  onReject: (approvalId: string) => void
  isLoading?: boolean
}

function ApprovalItem({ data, onApprove, onReject, isLoading }: ApprovalItemProps) {
  const { approval, action } = data
  const Icon = actionTypeIcons[action.actionType] ?? Terminal
  const risk = getActionRisk(action.actionType)
  const summary = action.summary ?? getActionTypeLabel(action.actionType)

  // Try to parse payload for display
  let payloadPreview = ""
  try {
    const payload = JSON.parse(action.payload)
    if (payload.command) payloadPreview = payload.command
    else if (payload.path) payloadPreview = payload.path
    else if (payload.message) payloadPreview = payload.message
  } catch {
    payloadPreview = action.payload.slice(0, 50)
  }

  return (
    <div className="border border-border/60 bg-card/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center border",
              risk === "high"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : risk === "medium"
                  ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                  : "border-border bg-muted text-muted-foreground"
            )}
          >
            <Icon className="size-3" />
          </span>
          <div>
            <p className="text-xs font-medium">{summary}</p>
            <p className="text-[0.65rem] text-muted-foreground truncate max-w-[200px]">
              {payloadPreview}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[0.55rem] uppercase",
            risk === "high"
              ? "border-destructive/30 text-destructive"
              : risk === "medium"
                ? "border-yellow-500/30 text-yellow-500"
                : "border-green-500/30 text-green-500"
          )}
        >
          {risk} risk
        </Badge>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="xs"
          variant="outline"
          className="flex-1 h-6 text-[0.65rem] border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-400"
          onClick={() => onApprove(approval.id)}
          disabled={isLoading}
        >
          <Check className="size-3 mr-1" />
          Approve
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="flex-1 h-6 text-[0.65rem] border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onReject(approval.id)}
          disabled={isLoading}
        >
          <X className="size-3 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface ApprovalDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingApprovals: ApprovalCardData[]
  mode: BridgeMode
  onApprove: (approvalId: string) => Promise<boolean>
  onReject: (approvalId: string) => Promise<boolean>
  onApproveAll: () => Promise<number>
  onRejectAll: () => Promise<number>
  onToggleMode: () => Promise<BridgeMode | null>
}

export function ApprovalDrawer({
  open,
  onOpenChange,
  pendingApprovals,
  mode,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  onToggleMode,
}: ApprovalDrawerProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [isBulkLoading, setIsBulkLoading] = useState(false)

  const handleApprove = async (approvalId: string) => {
    setLoadingId(approvalId)
    await onApprove(approvalId)
    setLoadingId(null)
  }

  const handleReject = async (approvalId: string) => {
    setLoadingId(approvalId)
    await onReject(approvalId)
    setLoadingId(null)
  }

  const handleApproveAll = async () => {
    setIsBulkLoading(true)
    await onApproveAll()
    setIsBulkLoading(false)
  }

  const handleRejectAll = async () => {
    setIsBulkLoading(true)
    await onRejectAll()
    setIsBulkLoading(false)
  }

  const handleToggleMode = async () => {
    await onToggleMode()
  }

  const pendingCount = pendingApprovals.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Action Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[0.6rem]">
                {pendingCount}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review and approve pending agent actions
          </SheetDescription>
        </SheetHeader>

        {/* Mode Toggle */}
        <div className="px-4 py-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mode === "safe" ? (
                <Shield className="size-4 text-yellow-500" />
              ) : (
                <Zap className="size-4 text-green-500" />
              )}
              <span className="text-xs font-medium">
                {mode === "safe" ? "Safe Mode" : "Auto Mode"}
              </span>
            </div>
            <Button
              size="xs"
              variant="outline"
              className="h-6 text-[0.65rem]"
              onClick={handleToggleMode}
            >
              Switch to {mode === "safe" ? "Auto" : "Safe"}
            </Button>
          </div>
          <p className="text-[0.6rem] text-muted-foreground mt-1">
            {mode === "safe"
              ? "Actions require your approval before execution"
              : "Actions execute automatically without approval"}
          </p>
        </div>

        {/* Pending Approvals List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {pendingCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCheck className="size-8 text-green-500/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                No pending approvals
              </p>
            </div>
          ) : (
            pendingApprovals.map((data) => (
              <ApprovalItem
                key={data.approval.id}
                data={data}
                onApprove={handleApprove}
                onReject={handleReject}
                isLoading={loadingId === data.approval.id || isBulkLoading}
              />
            ))
          )}
        </div>

        {/* Footer Actions */}
        {pendingCount > 0 && (
          <>
            <Separator />
            <SheetFooter className="flex-row gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-green-500/30 text-green-500 hover:bg-green-500/10"
                onClick={handleApproveAll}
                disabled={isBulkLoading}
              >
                <CheckCheck className="size-3 mr-1" />
                Approve All ({pendingCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={handleRejectAll}
                disabled={isBulkLoading}
              >
                <XCircle className="size-3 mr-1" />
                Reject All
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
