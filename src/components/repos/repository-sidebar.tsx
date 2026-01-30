import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  CircleDot,
  FolderGit2,
  GitBranch,
  Layers,
  Plus,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { repoStatusColor } from "@/lib/command-hub/helpers"
import { AddRepositoryDialog } from "./add-repository-dialog"
import type { NewRepositoryInput, Repository } from "./types"

interface RepositorySidebarProps {
  selectedRepo: string | null
  repositories: Repository[]
  runningCounts: Record<string, number>
  onSelectRepo: (repo: string | null) => void
  onAddRepository: (input: NewRepositoryInput) => Promise<boolean> | boolean
  onDeleteRepository?: (repo: string) => void
}

export function RepositorySidebar({
  selectedRepo,
  repositories,
  runningCounts,
  onSelectRepo,
  onAddRepository,
  onDeleteRepository,
}: RepositorySidebarProps) {
  return (
    <Card className="flex flex-col border-border/60 bg-card">
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
            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
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
            <div key={repo.name} className="flex items-center gap-1">
              <button
                onClick={() => onSelectRepo(repo.name)}
                className={cn(
                  "flex w-full flex-1 items-center justify-between rounded-xl border px-3 py-2 text-left transition",
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${repo.name}`}
                    disabled={running > 0 || !onDeleteRepository}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogMedia className="text-destructive">
                      <AlertTriangle />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Delete repository?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes {repo.name}, its commands, and history from
                      Commander.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteRepository?.(repo.name)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )
        })}
      </CardContent>
      <CardFooter>
        <AddRepositoryDialog onAddRepository={onAddRepository}>
          <Button variant="outline" className="w-full border-border bg-card text-xs">
            <Plus data-icon="inline-start" />
            Add repository
          </Button>
        </AddRepositoryDialog>
      </CardFooter>
    </Card>
  )
}
