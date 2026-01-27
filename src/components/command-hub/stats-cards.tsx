import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatCard } from "./types"

interface StatsCardsProps {
  stats: StatCard[]
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((item, index) => {
        const Icon = item.icon
        return (
          <Card
            key={item.label}
            className={cn(
              "border-border/70 bg-card/80 shadow-[0_12px_32px_var(--shadow-color)] backdrop-blur animate-in fade-in slide-in-from-bottom-6 duration-700",
              index === 0 && "delay-100",
              index === 1 && "delay-200",
              index === 2 && "delay-300"
            )}
          >
            <CardHeader className="border-b border-border/60">
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
            </CardHeader>
            {item.note && (
              <CardContent className="flex items-center justify-between text-[0.7rem] text-muted-foreground">
                <span>{item.note}</span>
                <ChevronRight className="size-4 text-muted-foreground/70" />
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
