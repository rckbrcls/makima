
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Plus, Square, Terminal } from "lucide-react"
import { CommandCard } from "./command-card"
import { QuickComposer } from "./quick-composer"
import { StatsCards } from "./stats-cards"
import type { Command, Repository, RunCommandInput, StatCard } from "./types"
import { DirectionAwareTabs } from "../ui/direction-aware-tabs"

interface CommandsTabProps {
  selectedRepo: string | null
  commands: Command[]
  onRunCommand?: (command: Command) => void
  onStopCommand?: (repo: string, commandName: string) => void
  onDeleteCommand?: (command: Command) => void
  onAddCommand?: (command: Command) => void | Promise<void>
  onUpdateCommand?: (command: Command) => void | Promise<void>
  onRunCommandInput?: (request: RunCommandInput) => void | Promise<void>
}

export function CommandsTab({
  selectedRepo,
  commands,
  onRunCommand,
  onStopCommand,
  onDeleteCommand,
  onAddCommand,
  onUpdateCommand,
  onRunCommandInput,
}: CommandsTabProps) {
  const stopAllForRepo = (repoName: string) => {
    if (!onStopCommand) return
    commands
      .filter((command) => command.repo === repoName && command.status === "running")
      .forEach((command) => onStopCommand(command.repo, command.name))
  }

  if (selectedRepo === null) {
    // All repos: grouped by repo
    return (
      <Card className="flex flex-col gap-4 p-4 pr-0 rounded-none h-full overflow-y-auto">
        <CardDescription>
          Select a repository to view its commands.
        </CardDescription>
      </Card>
    )
  }

  const tabs = [
    {
      id: 0,
      label: "commands",
      content: (
        <Card className="flex flex-col border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4 text-primary" />
              {selectedRepo}
            </CardTitle>
            <CardAction>
              <div className="flex gap-2">
                <QuickComposer
                  repoName={selectedRepo}
                  onRunCommand={onRunCommandInput}
                  onAddCommand={onAddCommand}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border bg-card"
                  >
                    <Plus data-icon="inline-start" />
                    Add command
                  </Button>
                </QuickComposer>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-border bg-card"
                  onClick={() => stopAllForRepo(selectedRepo)}
                >
                  <Square data-icon="inline-start" />
                  Stop all
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 py-4 ">
            {commands.map((command, index) => (
              <CommandCard
                key={`${command.repo} -${command.name} `}
                command={command}
                index={index}
                onRun={onRunCommand}
                onDelete={onDeleteCommand}
                onUpdateCommand={onUpdateCommand}
              />
            ))}
          </CardContent>
        </Card>
      ),
    },
    {
      id: 1,
      label: "pipelines",
      content: (
        <Card className="flex flex-col border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4 text-primary" />
              {selectedRepo}
            </CardTitle>
            <CardAction>
              <div className="flex gap-2">
                <QuickComposer
                  repoName={selectedRepo}
                  onRunCommand={onRunCommandInput}
                  onAddCommand={onAddCommand}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border bg-card"
                  >
                    <Plus data-icon="inline-start" />
                    Add command
                  </Button>
                </QuickComposer>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-border bg-card"
                  onClick={() => stopAllForRepo(selectedRepo)}
                >
                  <Square data-icon="inline-start" />
                  Stop all
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 py-4 ">
            {commands.map((command, index) => (
              <CommandCard
                key={`${command.repo} -${command.name} `}
                command={command}
                index={index}
                onRun={onRunCommand}
                onDelete={onDeleteCommand}
                onUpdateCommand={onUpdateCommand}
              />
            ))}
          </CardContent>
        </Card>
      ),
    },
  ]


  return (
    <div className="flex flex-col gap-4 h-full p-4 pl-3 pr-1 overflow-y-auto">

      <DirectionAwareTabs tabs={tabs} />

    </div>
  )
}
