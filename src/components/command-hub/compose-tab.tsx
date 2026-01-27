import { QuickComposer } from "./quick-composer"
import type { Repository } from "./types"

interface ComposeTabProps {
  selectedRepo: string | null
  repositories: Repository[]
}

export function ComposeTab({ selectedRepo, repositories }: ComposeTabProps) {
  // Se nenhum repo está selecionado, mostra para todos ou permite selecionar
  if (selectedRepo === null) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-none border border-border/60 bg-card/85 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Select a repository to compose commands, or choose one below:
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo) => (
            <QuickComposer key={repo.name} repoName={repo.name} />
          ))}
        </div>
      </div>
    )
  }

  return <QuickComposer repoName={selectedRepo} />
}
