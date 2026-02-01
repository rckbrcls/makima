import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Activity, Square, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LiveExecution } from "./types"

interface LiveExecutionCardProps {
  execution: LiveExecution
  onStop?: (repo: string, commandName: string) => void
}

export function LiveExecutionCard({ execution, onStop }: LiveExecutionCardProps) {
  return (
    <Card className="flex flex-col border-border/70 bg-card shrink-0">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          {execution.command}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className="border-chart-2/50 bg-chart-2/15 text-[0.6rem] uppercase text-chart-2"
          >
            running
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
          <span>PID {execution.pid}</span>
          <span>
            CPU {execution.cpu} | RAM {execution.ram}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden border border-border bg-muted">
          <div className="h-full w-2/3 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.6s_linear_infinite]" />
        </div>
        <div className="space-y-1 rounded-md border font-mono  border-border bg-muted/80 p-3 text-[0.65rem] text-foreground">
          {execution.logs.map((entry, i) => (
            <div
              key={i}
              className={cn(
                entry.stream === "stderr" && "text-destructive",
                entry.line.includes("failed") && "text-destructive"
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
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Terminal data-icon="inline-start" />
          Open log
        </Button>
      </CardFooter>
    </Card>
  )
}
