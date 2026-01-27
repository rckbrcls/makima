import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CircleDot, FolderGit2, GitBranch, Layers, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { repoStatusColor } from "@/lib/command-hub/helpers"
import type { Repository } from "./types"

interface RepositorySidebarProps {
  selectedRepo: string | null
  repositories: Repository[]
  runningCounts: Record<string, number>
  onSelectRepo: (repo: string | null) => void
}

export function RepositorySidebar({
  selectedRepo,
  repositories,
  runningCounts,
  onSelectRepo,
}: RepositorySidebarProps) {
  return (
    <Card className="flex flex-col border-border/60 bg-card/85 shadow-[0_14px_24px_var(--shadow-color)]">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderGit2 className="size-4 text-primary" />
          Repositories
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-1 overflow-y-auto">
        {/* All repositories */}
        <button
          onClick={() => onSelectRepo(null)}
          className={cn(
            "flex w-full items-center justify-between rounded-none border px-3 py-2 text-left transition",
            selectedRepo === null
              ? "border-primary/40 bg-primary/10"
              : "border-transparent hover:bg-accent/60"
          )}
        >
          <span className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Layers className="size-3.5 text-primary" />
            All repositories
          </span>
          <Badge variant="outline" className="text-[0.6rem]">
            {repositories.length}
          </Badge>
        </button>

        <Separator className="my-2 bg-border/60" />

        {/* Repo list */}
        {repositories.map((repo) => {
          const running = runningCounts[repo.name] || 0
          return (
            <button
              key={repo.name}
              onClick={() => onSelectRepo(repo.name)}
              className={cn(
                "flex w-full items-center justify-between rounded-none border px-3 py-2 text-left transition",
                selectedRepo === repo.name
                  ? "border-primary/40 bg-primary/10"
                  : "border-transparent hover:bg-accent/60"
              )}
            >
              <span className="flex items-center gap-2">
                <CircleDot
                  className={cn("size-3", repoStatusColor(repo.status))}
                />
                <span className="space-y-0.5">
                  <span className="block text-xs font-medium text-foreground">
                    {repo.name}
                  </span>
                  <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                    <GitBranch className="size-2.5" />
                    {repo.branch}
                  </span>
                </span>
              </span>
              {running > 0 && (
                <Badge
                  variant="outline"
                  className="border-chart-2/50 bg-chart-2/15 text-[0.55rem] text-chart-2"
                >
                  {running}
                </Badge>
              )}
            </button>
          )
        })}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full border-border bg-card/70 text-xs">
          <Plus data-icon="inline-start" />
          Add repository
        </Button>
      </CardFooter>
    </Card>
  )
}
