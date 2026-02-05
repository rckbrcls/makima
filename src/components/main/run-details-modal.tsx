import type { ExecutionRun } from "@/components/main/jarvis-types";
import { runStatusMeta } from "@/components/main/jarvis-data";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RunDetailsModalProps {
  activeRun: ExecutionRun | null;
  onClose: () => void;
}

export function RunDetailsModal({ activeRun, onClose }: RunDetailsModalProps) {
  if (!activeRun) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6"
      onClick={onClose}
    >
      <Card
        className="border-border bg-background max-h-[85vh] w-full max-w-4xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="border-border border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{activeRun.title}</CardTitle>
              <CardDescription>{activeRun.command}</CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                runStatusMeta[activeRun.status].className,
              )}
            >
              {runStatusMeta[activeRun.status].label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 py-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Timeline
            </p>
            <div className="space-y-2">
              {activeRun.steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                    step.status === "success"
                      ? "border-emerald-500 bg-emerald-600 text-emerald-950"
                      : step.status === "error"
                        ? "border-red-500 bg-red-600 text-red-950"
                        : step.status === "running"
                          ? "border-yellow-500 bg-yellow-600 text-yellow-950"
                          : "border-border/60 text-muted-foreground",
                  )}
                >
                  <span>{step.label}</span>
                  <span className="text-[10px] uppercase">{step.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Full logs
            </p>
            <div className="border-border/60 bg-muted/30 max-h-[320px] overflow-y-auto rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap">
              {activeRun.logs.join("\n")}
            </div>
            <p className="text-muted-foreground text-xs">{activeRun.summary}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
