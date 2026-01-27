import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QuickComposer } from "./quick-composer"
import type { Repository } from "./types"

interface ComposeTabProps {
  selectedRepo: string | null
  repositories: Repository[]
}

export function ComposeTab({ selectedRepo, repositories }: ComposeTabProps) {
  const [composeRepo, setComposeRepo] = useState<string>(
    selectedRepo || repositories[0]?.name || ""
  )

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
        <QuickComposer repoName={composeRepo} />
      </div>
    )
  }

  // Se um repo está selecionado no sidebar, usa ele diretamente
  return <QuickComposer repoName={selectedRepo} />
}
