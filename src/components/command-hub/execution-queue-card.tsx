import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { RunQueueItem } from "./types"

interface ExecutionQueueCardProps {
  queue: RunQueueItem[]
}

export function ExecutionQueueCard({ queue }: ExecutionQueueCardProps) {
  return (
    <Card className="flex flex-col border-border/60 bg-card/85 shadow-[0_18px_36px_var(--shadow-color)]">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-sm">Execution queue</CardTitle>
        <CardDescription>What comes next in the pipeline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {queue.map((item) => (
          <div
            key={`${item.repo}-${item.name}`}
            className="space-y-1 border border-border bg-card/70 p-3"
          >
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>{item.name}</span>
              <span className="text-[0.65rem] text-muted-foreground">
                {item.eta}
              </span>
            </div>
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              {item.repo}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
