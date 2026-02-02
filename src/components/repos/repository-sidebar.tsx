import {
  AlertTriangle,
  CircleDot,
  FolderGit2,
  GitBranch,
  Plus,
  Trash2,
} from "lucide-react";
import { AddRepositoryDialog } from "./add-repository-dialog";
import type { NewRepositoryInput, Repository } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { repoStatusColor } from "@/lib/command-hub/helpers";

interface RepositorySidebarProps {
  selectedRepo: string | null;
  repositories: Array<Repository>;
  runningCounts: Record<string, number>;
  onSelectRepo: (repo: string | null) => void;
  onAddRepository: (input: NewRepositoryInput) => Promise<boolean> | boolean;
  onDeleteRepository?: (repo: string) => void;
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
    <Card className="border-border bg-card flex flex-col rounded-none">
      <CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {/* Repo list */}
        {repositories.map((repo) => {
          const running = runningCounts[repo.name] || 0;
          return (
            <div
              key={repo.name}
              className={cn(
                "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground group/item flex w-full cursor-pointer items-center justify-between rounded-sm border p-2 px-2.5 transition-all duration-200",
                selectedRepo === repo.name
                  ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground hover:bg-primary hover:text-primary-foreground/90 dark:hover:bg-primary/90 dark:hover:text-primary-foreground/90"
                  : "hover:bg-accent/60 border-transparent",
              )}
            >
              <button
                onClick={() => onSelectRepo(repo.name)}
                className="flex w-full items-center gap-2"
              >
                <span className="flex items-center gap-2">
                  <CircleDot
                    className={cn("size-3", repoStatusColor(repo.status))}
                  />
                  <span className="space-y-0.5">
                    <span className="block text-xs font-medium">
                      {repo.name}
                    </span>
                    <span className="flex items-center gap-1 text-[0.6rem]">
                      <GitBranch className="size-2.5" />
                      {repo.branch}
                    </span>
                  </span>
                </span>
                {running > 0 && (
                  <Badge
                    variant="outline"
                    className="border-chart-2/50 bg-chart-2/15 text-chart-2 text-[0.55rem]"
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
                      Makima.
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
          );
        })}
      </CardContent>
      <CardFooter>
        <AddRepositoryDialog onAddRepository={onAddRepository}>
          <Button
            variant="outline"
            className="border-border bg-card w-full text-xs"
          >
            <Plus data-icon="inline-start" />
            Add repository
          </Button>
        </AddRepositoryDialog>
      </CardFooter>
    </Card>
  );
}
