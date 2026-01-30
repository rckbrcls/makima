import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CircleDot, GitBranch, Plus, Square, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { repoStatusColor, getRepo, groupByRepo } from "@/lib/command-hub/helpers"
import { CommandCard } from "./command-card"
import { QuickComposer } from "./quick-composer"
import { StatsCards } from "./stats-cards"
import type { Command, Repository, RunCommandInput, StatCard } from "./types"

interface CommandsTabProps {
  selectedRepo: string | null
  commands: Command[]
  repositories: Repository[]
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
  repositories,
  onRunCommand,
  onStopCommand,
  onDeleteCommand,
  onAddCommand,
  onUpdateCommand,
  onRunCommandInput,
}: CommandsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState<Command | undefined>(undefined)
  const groupedCommands = groupByRepo(commands)

  const handleEdit = (command: Command) => {
    setEditingCommand(command)
    setDialogOpen(true)
  }

  const handleUpdateCommand = async (command: Command) => {
    await onUpdateCommand?.(command)
    setEditingCommand(undefined)
    setDialogOpen(false)
  }

  const handleAddCommand = async (command: Command) => {
    await onAddCommand?.(command)
    setDialogOpen(false)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingCommand(undefined)
    }
  }

  const stopAllForRepo = (repoName: string) => {
    if (!onStopCommand) return
    commands
      .filter((command) => command.repo === repoName && command.status === "running")
      .forEach((command) => onStopCommand(command.repo, command.name))
  }

  if (selectedRepo === null) {
    // All repos: grouped by repo
    return (
      <div className="flex flex-col gap-4">
        {Object.entries(groupedCommands).map(([repoName, cmds]) => {
          const repo = getRepo(repoName, repositories)
          return (
            <section key={repoName}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CircleDot
                    className={cn(
                      "size-3",
                      repoStatusColor(repo?.status ?? "idle")
                    )}
                  />
                  {repoName}
                  <span className="flex items-center gap-1 text-[0.6rem] font-normal text-muted-foreground">
                    <GitBranch className="size-2.5" />
                    {repo?.branch}
                  </span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border bg-card"
                  onClick={() => stopAllForRepo(repoName)}
                >
                  <Square data-icon="inline-start" />
                  Stop all
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {cmds.map((command, index) => (
                  <CommandCard
                    key={`${repoName}-${command.name}`}
                    command={command}
                    index={index}
                    onRun={onRunCommand}
                    onDelete={onDeleteCommand}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
              <Separator className="mt-4 bg-border/60" />
            </section>
          )
        })}
        {/* Quick Composer Dialog for editing when no repo is selected */}
        <QuickComposer
          repoName={editingCommand?.repo || ""}
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          onRunCommand={onRunCommandInput}
          onAddCommand={handleAddCommand}
          onUpdateCommand={handleUpdateCommand}
          editingCommand={editingCommand}
        />
      </div>
    )
  }

  // Single repo: summary + grid + Quick Composer
  const runningCount = commands.filter((c) => c.status === "running").length
  const successCount = commands.filter((c) => c.status === "success").length

  const summaryStats: StatCard[] = [
    {
      label: "Total commands",
      value: String(commands.length),
      note: `in ${selectedRepo}`,
    },
    {
      label: "Running",
      value: String(runningCount),
      note: "active now",
    },
    {
      label: "Last passed",
      value: String(successCount),
      note: "succeeded",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <StatsCards stats={summaryStats} />

      {/* Commands grid */}
      <Card className="flex flex-col border-border/60 bg-card">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="size-4 text-primary" />
            {selectedRepo} | commands
          </CardTitle>
          <CardDescription>
            Every command runs in background with live feedback.
          </CardDescription>
          <CardAction>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-card"
                onClick={() => {
                  setEditingCommand(undefined)
                  setDialogOpen(true)
                }}
              >
                <Plus data-icon="inline-start" />
                Add command
              </Button>
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
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2">
          {commands.map((command, index) => (
            <CommandCard
              key={`${command.repo}-${command.name}`}
              command={command}
              index={index}
              onRun={onRunCommand}
              onDelete={onDeleteCommand}
              onEdit={handleEdit}
            />
          ))}
        </CardContent>
      </Card>

      {/* Quick Composer Dialog */}
      <QuickComposer
        repoName={selectedRepo || ""}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onRunCommand={onRunCommandInput}
        onAddCommand={handleAddCommand}
        onUpdateCommand={handleUpdateCommand}
        editingCommand={editingCommand}
      />
    </div>
  )
}
