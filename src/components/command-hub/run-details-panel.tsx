import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FileText, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExecutionHistoryItem } from "./types"

interface RunDetailsPanelProps {
  run: ExecutionHistoryItem
  logs: string[]
}

export function RunDetailsPanel({ run, logs }: RunDetailsPanelProps) {
  return (
    <Card className="flex flex-col border-border/60 bg-card/85">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4 text-primary" />
          Run details
        </CardTitle>
        <CardDescription>
          {run.name} — {run.repo}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
          <span>Exit code: {run.status === "failed" ? "1" : "0"}</span>
          <span>Duration: {run.duration}</span>
        </div>
        <div className="h-1 w-full overflow-hidden border border-border bg-muted">
          <div
            className={cn(
              "h-full w-full",
              run.status === "failed"
                ? "bg-destructive/70"
                : "bg-chart-1/70"
            )}
          />
        </div>
        <div className="space-y-1 rounded-none border border-border bg-muted/80 p-3 text-[0.65rem] text-foreground">
          {logs.map((line, i) => (
            <div
              key={i}
              className={cn(
                (line.includes("failed") || line.includes("aborted")) &&
                  "text-destructive",
                line.includes("passed") && "text-chart-1"
              )}
            >
              {line}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm" className="border-border bg-card/70">
          <FileText data-icon="inline-start" />
          Full log
        </Button>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Play data-icon="inline-start" />
          Re-run
        </Button>
      </CardFooter>
    </Card>
  )
}
