import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ModeToggle } from "@/components/mode-toggle"
import { Menu, Plus, Search, Sparkles, Terminal, Wand2 } from "lucide-react"
import { AddRepositoryDialog } from "./add-repository-dialog"
import { QuickComposer } from "./quick-composer"
import type { Command, NewRepositoryInput, Repository, RunCommandInput } from "./types"

interface CommandHubHeaderProps {
  onMenuClick: () => void
  onAddRepository: (input: NewRepositoryInput) => Promise<boolean> | boolean
  repositories: Repository[]
  selectedRepo: string | null
  onRunCommandInput?: (request: RunCommandInput) => void | Promise<void>
  onAddCommand?: (command: Command) => void | Promise<void>
}

export function CommandHubHeader({
  onMenuClick,
  onAddRepository,
  repositories,
  selectedRepo,
  onRunCommandInput,
  onAddCommand,
}: CommandHubHeaderProps) {
  const [composeDialogOpen, setComposeDialogOpen] = useState(false)
  const [composeRepo, setComposeRepo] = useState<string>(
    selectedRepo || repositories[0]?.name || ""
  )

  useEffect(() => {
    if (selectedRepo) {
      setComposeRepo(selectedRepo)
      return
    }
    if (repositories.length > 0) {
      const firstRepo = repositories[0]?.name
      if (firstRepo && (!composeRepo || !repositories.find((r) => r.name === composeRepo))) {
        setComposeRepo(firstRepo)
      }
    }
  }, [selectedRepo, repositories, composeRepo])

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex size-12 items-center justify-center border border-border/70 bg-card/70">
              <Terminal className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
                Command panel
              </p>
              <h1 className="text-2xl font-semibold">Commander</h1>
              <p className="text-xs text-muted-foreground">
                Orchestrate build, run and deploy per repository in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 min-[480px]:flex-nowrap">
            <div className="relative w-full min-w-[220px] max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search commands, repos or tags"
                className="h-9 border-border bg-background/80 pl-8 text-xs"
              />
            </div>
            <ModeToggle />
            <Button variant="outline" className="h-9 border-border bg-card/70 text-xs">
              <Sparkles data-icon="inline-start" />
              Auto-setup
            </Button>
            <Button
              variant="outline"
              className="h-9 border-border bg-card/70 text-xs"
              onClick={() => setComposeDialogOpen(true)}
            >
              <Wand2 data-icon="inline-start" />
              New command
            </Button>
            <AddRepositoryDialog onAddRepository={onAddRepository}>
              <Button className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus data-icon="inline-start" />
                New repo
              </Button>
            </AddRepositoryDialog>
          </div>
        </div>
      </header>

      {/* Compose Dialog */}
      <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>New command</DialogTitle>
            <DialogDescription>
              Select a repository and build custom commands.
            </DialogDescription>
          </DialogHeader>
          {repositories.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No repositories available. Add a repository to start composing commands.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-foreground">
                  Repository:
                </label>
                <Select value={composeRepo} onValueChange={setComposeRepo}>
                  <SelectTrigger className="w-full border-border bg-background/80">
                    <SelectValue placeholder="Select repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.name} value={repo.name}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <QuickComposer
                repoName={composeRepo}
                inline={true}
                onRunCommand={onRunCommandInput}
                onAddCommand={(command) => {
                  onAddCommand?.(command)
                  setComposeDialogOpen(false)
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
