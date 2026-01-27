import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CircleDot } from "lucide-react"
import { cn } from "@/lib/utils"
import { repoStatusColor, getRepo } from "@/lib/command-hub/helpers"
import type { Pipeline, Repository } from "./types"

interface BuildStepsCardProps {
  pipelines: Pipeline[]
  selectedRepo: string | null
  repositories: Repository[]
}

export function BuildStepsCard({
  pipelines,
  selectedRepo,
  repositories,
}: BuildStepsCardProps) {
  return (
    <Card className="shrink-0 border-border/60 bg-card/85 shadow-[0_16px_28px_var(--shadow-color)]">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-sm">Build steps</CardTitle>
        <CardDescription>Progress visualization per step.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pipelines.map((p) => (
          <div key={p.repo} className="space-y-3">
            {selectedRepo === null && (
              <div className="flex items-center gap-2 text-[0.65rem] font-medium text-foreground">
                <CircleDot
                  className={cn(
                    "size-2.5",
                    repoStatusColor(
                      getRepo(p.repo, repositories)?.status ?? "idle"
                    )
                  )}
                />
                {p.repo}
              </div>
            )}
            {p.steps.map((step) => (
              <div
                key={`${p.repo}-${step.label}`}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-foreground/80">{step.label}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[0.6rem] uppercase",
                    step.state === "done" &&
                      "border-chart-1/50 bg-chart-1/15 text-chart-1",
                    step.state === "running" &&
                      "border-chart-4/50 bg-chart-4/15 text-chart-4",
                    step.state === "pending" &&
                      "border-border bg-card text-muted-foreground"
                  )}
                >
                  {step.state}
                </Badge>
              </div>
            ))}
            {selectedRepo === null && <Separator className="bg-border/60" />}
          </div>
        ))}
        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
          <CircleDot className="size-3 text-chart-4" />
          Estimated build at 14:41
        </div>
      </CardContent>
    </Card>
  )
}
