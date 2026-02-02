import { Activity, Square, Terminal } from "lucide-react";
import type { LiveExecution } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LiveExecutionCardProps {
  execution: LiveExecution;
  onStop?: (repo: string, commandName: string) => void;
}

export function LiveExecutionCard({
  execution,
  onStop,
}: LiveExecutionCardProps) {
  return (
    <Card className="border-border/70 bg-card flex shrink-0 flex-col">
      <CardHeader className="border-border/60 border-b">
        <CardTitle className="flex items-center gap-2 text-sm">
          {execution.command}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className="border-chart-2/50 bg-chart-2/15 text-chart-2 text-[0.6rem] uppercase"
          >
            running
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-muted-foreground flex items-center justify-between text-[0.65rem]">
          <span>PID {execution.pid}</span>
          <span>
            CPU {execution.cpu} | RAM {execution.ram}
          </span>
        </div>
        <div className="border-border bg-muted h-1 w-full overflow-hidden border">
          <div className="from-chart-1 via-chart-2 to-chart-1/80 h-full w-2/3 animate-[shimmer_2.6s_linear_infinite] bg-gradient-to-r bg-[length:200%_100%]" />
        </div>
        <div className="border-border bg-muted/80 text-foreground space-y-1 rounded-md border p-3 font-mono text-[0.65rem]">
          {execution.logs.map((entry, i) => (
            <div
              key={i}
              className={cn(
                entry.stream === "stderr" && "text-destructive",
                entry.line.includes("failed") && "text-destructive",
              )}
            >
              {entry.line}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button
          variant="outline"
          size="sm"
          className="border-border bg-card"
          onClick={() => onStop?.(execution.repo, execution.command)}
        >
          <Square data-icon="inline-start" />
          Terminate
        </Button>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Terminal data-icon="inline-start" />
          Open log
        </Button>
      </CardFooter>
    </Card>
  );
}
