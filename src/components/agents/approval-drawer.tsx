import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  FileCode,
  Folder,
  GitBranch,
  Globe,
  Shield,
  Terminal,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { getActionRisk, getActionTypeLabel, getStatusColor } from "./types";
import type {
  Action,
  ActionType,
  Approval,
  ApprovalCardData,
  BridgeMode,
} from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
};

// ============================================================================
// Approval Card
// ============================================================================

interface ApprovalItemProps {
  data: ApprovalCardData;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  isLoading?: boolean;
}

function ApprovalItem({
  data,
  onApprove,
  onReject,
  isLoading,
}: ApprovalItemProps) {
  const { approval, action } = data;
  const Icon = actionTypeIcons[action.actionType] ?? Terminal;
  const risk = getActionRisk(action.actionType);
  const summary = action.summary ?? getActionTypeLabel(action.actionType);

  // Try to parse payload for display
  let payloadPreview = "";
  try {
    const payload = JSON.parse(action.payload);
    if (payload.command) payloadPreview = payload.command;
    else if (payload.path) payloadPreview = payload.path;
    else if (payload.message) payloadPreview = payload.message;
  } catch {
    payloadPreview = action.payload.slice(0, 50);
  }

  return (
    <div className="border-border/60 bg-card space-y-2 border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center border",
              risk === "high"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : risk === "medium"
                  ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                  : "border-border bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3" />
          </span>
          <div>
            <p className="text-xs font-medium">{summary}</p>
            <p className="text-muted-foreground max-w-[200px] truncate text-[0.65rem]">
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
                : "border-green-500/30 text-green-500",
          )}
        >
          {risk} risk
        </Badge>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="xs"
          variant="outline"
          className="h-6 flex-1 border-green-500/30 text-[0.65rem] text-green-500 hover:bg-green-500/10 hover:text-green-400"
          onClick={() => onApprove(approval.id)}
          disabled={isLoading}
        >
          <Check className="mr-1 size-3" />
          Approve
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive h-6 flex-1 text-[0.65rem]"
          onClick={() => onReject(approval.id)}
          disabled={isLoading}
        >
          <X className="mr-1 size-3" />
          Reject
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ApprovalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingApprovals: Array<ApprovalCardData>;
  mode: BridgeMode;
  onApprove: (approvalId: string) => Promise<boolean>;
  onReject: (approvalId: string) => Promise<boolean>;
  onApproveAll: () => Promise<number>;
  onRejectAll: () => Promise<number>;
  onToggleMode: () => Promise<BridgeMode | null>;
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
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const handleApprove = async (approvalId: string) => {
    setLoadingId(approvalId);
    await onApprove(approvalId);
    setLoadingId(null);
  };

  const handleReject = async (approvalId: string) => {
    setLoadingId(approvalId);
    await onReject(approvalId);
    setLoadingId(null);
  };

  const handleApproveAll = async () => {
    setIsBulkLoading(true);
    await onApproveAll();
    setIsBulkLoading(false);
  };

  const handleRejectAll = async () => {
    setIsBulkLoading(true);
    await onRejectAll();
    setIsBulkLoading(false);
  };

  const handleToggleMode = async () => {
    await onToggleMode();
  };

  const pendingCount = pendingApprovals.length;

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-card data-[vaul-drawer-direction=right]:rounded-l-4xl">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Action Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[0.6rem]">
                {pendingCount}
              </Badge>
            )}
          </DrawerTitle>
          <DrawerDescription>
            Review and approve pending agent actions
          </DrawerDescription>
        </DrawerHeader>

        {/* Mode Toggle */}
        <div className="border-border/60 border-b px-4 py-3">
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
          <p className="text-muted-foreground mt-1 text-[0.6rem]">
            {mode === "safe"
              ? "Actions require your approval before execution"
              : "Actions execute automatically without approval"}
          </p>
        </div>

        {/* Pending Approvals List */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {pendingCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCheck className="mb-2 size-8 text-green-500/50" />
              <p className="text-muted-foreground text-xs">
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
            <DrawerFooter className="flex-row gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-green-500/30 text-green-500 hover:bg-green-500/10"
                onClick={handleApproveAll}
                disabled={isBulkLoading}
              >
                <CheckCheck className="mr-1 size-3" />
                Approve All ({pendingCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 flex-1"
                onClick={handleRejectAll}
                disabled={isBulkLoading}
              >
                <XCircle className="mr-1 size-3" />
                Reject All
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
