import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { StatCard } from "./types"

interface StatsCardsProps {
  stats: StatCard[]
}

export function StatsCards({ stats }: StatsCardsProps) {
  const delayClasses = [
    "delay-100",
    "delay-200",
    "delay-300",
    "delay-500",
    "delay-700",
    "delay-1000",
  ]

  return (
    <div className="grid gap-3 grid-cols-3">
      {stats.map((item, index) => {
        const Icon = item.icon
        const delayClass = delayClasses[Math.min(index, delayClasses.length - 1)]
        return (
          <Card
            key={item.label}
            className={cn(
              "border-border justify-between p-4 bg-card animate-in fade-in duration-700",
              delayClass
            )}
          >
            <CardDescription className="uppercase tracking-[0.3em] text-[0.55rem] text-muted-foreground">
              {item.label}
            </CardDescription>
            <CardTitle
              className={cn(
                "text-2xl text-foreground",
                Icon && "flex items-center gap-2"
              )}
            >
              {Icon && <Icon className="size-5 text-primary" />}
              {item.value}
            </CardTitle>
          </Card>
        )
      })}
    </div >
  )
}
