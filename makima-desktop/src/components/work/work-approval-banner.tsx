import { ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWorkPendingApprovals } from "@/stores"
import { useOpenClawApprovals } from "@/hooks/openclaw"

export function WorkApprovalBanner() {
  const pendingApprovals = useWorkPendingApprovals()
  const { approve, reject } = useOpenClawApprovals()

  if (pendingApprovals.length === 0) return null

  return (
    <div className="border-b border-amber-800 bg-amber-950 p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-400">
        <ShieldOff className="size-4" />
        Pending Approvals ({pendingApprovals.length})
      </h4>
      <div className="space-y-2">
        {pendingApprovals.map((approval) => (
          <div
            key={approval.id}
            className="glass rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-foreground text-sm">
                  {approval.action.description}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-muted-foreground text-xs">
                    {approval.action.payload}
                  </code>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      approval.action.risk === "high"
                        ? "border border-rose-600 bg-rose-900 text-rose-300"
                        : approval.action.risk === "medium"
                          ? "border border-amber-600 bg-amber-900 text-amber-300"
                          : "border border-emerald-600 bg-emerald-900 text-emerald-300",
                    )}
                  >
                    {approval.action.risk}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-600 text-emerald-400"
                  onClick={() => approve(approval.id)}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-600 text-rose-400"
                  onClick={() => reject(approval.id)}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
