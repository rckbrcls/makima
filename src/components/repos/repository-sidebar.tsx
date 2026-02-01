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
import {
  AlertTriangle,
  CircleDot,
  FolderGit2,
  GitBranch,
  Plus,
  Trash2,
}
  from "lucide-react"
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
    <Card className="flex rounded-none flex-col border-border bg-card">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderGit2 className="size-4 text-primary" />
          Repositories
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {/* Repo list */}
        {repositories.map((repo) => {
          const running = runningCounts[repo.name] || 0
          return (
            <div key={repo.name} className={cn(
              "flex justify-between p-2 cursor-pointer border border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground w-full items-center rounded-sm px-2.5 transition-all duration-200 group/item",
              selectedRepo === repo.name
                ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground hover:bg-primary hover:text-primary-foreground/90 dark:hover:bg-primary/90 dark:hover:text-primary-foreground/90"
                : "border-transparent hover:bg-accent/60"
            )}>
              <button
                onClick={() => onSelectRepo(repo.name)}
                className="w-full flex items-center gap-2"
              >
                <span className="flex items-center gap-2">
                  <CircleDot
                    className={cn("size-3", repoStatusColor(repo.status))}
                  />
                  <span className="space-y-0.5">
                    <span className="block text-xs font-medium ">
                      {repo.name}
                    </span>
                    <span className="flex items-center gap-1 text-[0.6rem] ">
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
                    className=""
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
                      Overseer.
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
    </Card >
  )
}
