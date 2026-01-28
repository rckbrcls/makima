import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QuickComposer } from "./quick-composer"
import type { Command, Repository, RunCommandInput } from "./types"

interface ComposeTabProps {
  selectedRepo: string | null
  repositories: Repository[]
  onRunCommand?: (request: RunCommandInput) => void | Promise<void>
  onAddCommand?: (command: Command) => void | Promise<void>
}

export function ComposeTab({
  selectedRepo,
  repositories,
  onRunCommand,
  onAddCommand,
}: ComposeTabProps) {
  const [composeRepo, setComposeRepo] = useState<string>(
    selectedRepo || repositories[0]?.name || ""
  )

  useEffect(() => {
    if (selectedRepo) {
      setComposeRepo(selectedRepo)
      return
    }
    // Garantir que composeRepo nunca seja vazio quando há repositórios disponíveis
    if (repositories.length > 0) {
      const firstRepo = repositories[0]?.name
      if (firstRepo && (!composeRepo || !repositories.find((r) => r.name === composeRepo))) {
        setComposeRepo(firstRepo)
      }
    }
  }, [selectedRepo, repositories, composeRepo])

  // Se não há repositórios disponíveis
  if (repositories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No repositories available. Add a repository to start composing commands.
        </p>
      </div>
    )
  }

  // Se nenhum repo está selecionado no sidebar, mostra select + composer
  if (selectedRepo === null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">
            Repository:
          </label>
          <Select value={composeRepo} onValueChange={setComposeRepo}>
            <SelectTrigger className="w-[200px] border-border bg-background/80">
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
          onRunCommand={onRunCommand}
          onAddCommand={onAddCommand}
        />
      </div>
    )
  }

  // Se um repo está selecionado no sidebar, usa ele diretamente
  return (
    <QuickComposer
      repoName={selectedRepo}
      onRunCommand={onRunCommand}
      onAddCommand={onAddCommand}
    />
  )
}
