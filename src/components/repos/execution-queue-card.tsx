import type { RunQueueItem } from "./types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ExecutionQueueCardProps {
  queue: Array<RunQueueItem>;
}

export function ExecutionQueueCard({ queue }: ExecutionQueueCardProps) {
  return (
    <Card className="border-border/60 bg-card flex flex-col">
      <CardHeader className="border-border/60 border-b">
        <CardTitle className="text-sm">Execution queue</CardTitle>
        <CardDescription>What comes next in the pipeline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {queue.map((item) => (
          <div
            key={item.id}
            className="border-border bg-card space-y-1 border p-3"
          >
            <div className="text-foreground flex items-center justify-between text-xs font-medium">
              <span>{item.name}</span>
              <span className="text-muted-foreground text-[0.65rem]">
                {item.queuedAt}
              </span>
            </div>
            <div className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
              {item.repo}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
