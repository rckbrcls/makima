import type { ElementType } from "react"
import {
  Activity,
  AlertTriangle,
  Hammer,
  Package,
  Play,
  Zap,
} from "lucide-react"

export const statusStyles: Record<string, string> = {
  running: "border-chart-2/50 bg-chart-2/15 text-chart-2",
  queued: "border-chart-4/50 bg-chart-4/15 text-chart-4",
  success: "border-chart-1/50 bg-chart-1/15 text-chart-1",
  failed: "border-destructive/40 bg-destructive/15 text-destructive",
  idle: "border-border bg-muted/60 text-muted-foreground",
}

export const typeIcons: Record<string, ElementType> = {
  run: Play,
  build: Hammer,
  test: Activity,
  lint: Zap,
  check: AlertTriangle,
  bundle: Package,
}
