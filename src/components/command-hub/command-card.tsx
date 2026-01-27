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
import { Clock, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { statusStyles, typeIcons } from "@/lib/command-hub/constants"
import type { Command } from "./types"

interface CommandCardProps {
  command: Command
  index: number
  onRun?: (command: Command) => void
}

export function CommandCard({ command, index, onRun }: CommandCardProps) {
  const Icon = typeIcons[command.type]

  return (
    <Card
      size="sm"
      className={cn(
        "border-border/70 bg-card/80 shadow-[0_10px_20px_var(--shadow-color)] animate-in fade-in slide-in-from-bottom-8 duration-700",
        index % 2 === 0 ? "delay-200" : "delay-300"
      )}
    >
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-7 items-center justify-center border border-border bg-muted text-foreground/80">
            <Icon className="size-4" />
          </span>
          {command.name}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className={cn("text-[0.6rem] uppercase", statusStyles[command.status])}
          >
            {command.status}
          </Badge>
        </CardAction>
        <CardDescription className="text-[0.7rem] text-muted-foreground">
          {command.command}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
          <span>last run: {command.lastRun}</span>
          <span className="text-foreground/80">time: {command.duration}</span>
        </div>
        <div className="h-1 w-full overflow-hidden border border-border bg-muted">
          <div
            className={cn(
              "h-full",
              command.status === "running"
                ? "w-3/4 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.8s_linear_infinite]"
                : command.status === "queued"
                ? "w-1/3 bg-chart-4/80"
                : command.status === "failed"
                ? "w-full bg-destructive/70"
                : command.status === "success"
                ? "w-full bg-chart-1/70"
                : "w-0"
            )}
          />
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
          <Clock className="size-3" />
          scheduled at 14:30
        </div>
        <Button
          size="xs"
          className="h-6 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => onRun?.(command)}
        >
          <Play data-icon="inline-start" />
          Run
        </Button>
      </CardFooter>
    </Card>
  )
}
