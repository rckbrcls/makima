import { useMemo } from "react";
import { ApprovalDrawer } from "./approval-drawer";
import type { ApprovalCardData, ApprovalWithAction } from "./types";
import { useAgentState } from "@/hooks/use-agent-state";
import { useUIStore } from "@/stores/ui-store";

export function GlobalApprovalDrawer() {
  const {
    state: agentState,
    mode,
    agents,
    pendingApprovals,
    approveAction,
    rejectAction,
    approveAllPending,
    rejectAllPending,
    toggleMode,
  } = useAgentState();

  const { approvalDrawerOpen, setApprovalDrawerOpen, selectedSession } =
    useUIStore();

  // Build approval card data from ApprovalWithAction
  const approvalCardData: Array<ApprovalCardData> = useMemo(() => {
    return pendingApprovals.map((approvalWithAction: ApprovalWithAction) => {
      const action = approvalWithAction.action;
      const session = agentState.sessions.find(
        (s) => s.id === action?.sessionId,
      );
      const agentWithRepos = agents.find((a) => a.id === session?.agentId);

      return {
        approval: approvalWithAction,
        action: action ?? {
          id: "",
          sessionId: "",
          actionType: "notify" as const,
          status: "pending" as const,
          payload: "{}",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        session: session ?? {
          id: "",
          agentId: "",
          repoName: "",
          goal: "",
          state: "active" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        agent: agentWithRepos ?? {
          id: "",
          name: "Unknown",
          provider: "cli" as const,
          status: "idle" as const,
          skills: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          repos: [],
        },
      };
    });
  }, [pendingApprovals, agentState.sessions, agents]);

  const handleApprove = async (approvalId: string) => {
    return approveAction(approvalId, "user");
  };

  const handleReject = async (approvalId: string) => {
    return rejectAction(approvalId, "user");
  };

  const handleApproveAll = async () => {
    if (selectedSession) {
      return approveAllPending(selectedSession.id, "user");
    }
    // Approve all if no specific session selected
    let count = 0;
    for (const approval of pendingApprovals) {
      await approveAction(approval.id, "user");
      count++;
    }
    return count;
  };

  const handleRejectAll = async () => {
    if (selectedSession) {
      return rejectAllPending(selectedSession.id, "user");
    }
    // Reject all if no specific session selected
    let count = 0;
    for (const approval of pendingApprovals) {
      await rejectAction(approval.id, "user");
      count++;
    }
    return count;
  };

  const handleToggleMode = async () => {
    return toggleMode();
  };

  return (
    <ApprovalDrawer
      open={approvalDrawerOpen}
      onOpenChange={setApprovalDrawerOpen}
      pendingApprovals={approvalCardData}
      mode={mode}
      onApprove={handleApprove}
      onReject={handleReject}
      onApproveAll={handleApproveAll}
      onRejectAll={handleRejectAll}
      onToggleMode={handleToggleMode}
    />
  );
}
