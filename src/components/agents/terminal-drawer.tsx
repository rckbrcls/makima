import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useUIStore } from "@/stores/ui-store"
import { useCommandStore } from "@/stores/command-store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Plus, Square, Terminal as TerminalIcon } from "lucide-react"
import { CommandCard } from "@/components/repos/command-card"
import { QuickComposer } from "@/components/repos/quick-composer"
import { DirectionAwareTabs } from "../ui/direction-aware-tabs"
import { filterByRepo } from "@/lib/command-hub/helpers"
import type { Command, RunCommandInput } from "@/components/repos/types"

export function TerminalDrawer() {
  const {
    terminalDrawerOpen,
    setTerminalDrawerOpen,
    selectedRepo,
  } = useUIStore()

  const {
    commands,
    runCommand,
    stopCommand,
    addCommand,
    updateCommand,
    deleteCommand,
  } = useCommandStore()

  // Ensure commands is typed as Command[]
  const filteredCommands = filterByRepo<Command>(commands, selectedRepo)

  const stopAllForRepo = (repo: string | null) => {
    if (!repo) return
    const repoCommands = filteredCommands.filter((c) => c.status === "running")
    repoCommands.forEach((c) => {
      stopCommand({ repo, command: c.name })
    })
  }

  const handleRunCommand = (command: Command) => {
    runCommand({
      repo: command.repo,
      name: command.name,
      command: command.command,
      commandType: command.type,
    })
  }

  const handleRunCommandInput = (input: RunCommandInput) => {
    runCommand(input)
  }

  const handleDeleteCommand = (command: Command) => {
    deleteCommand(command.repo, command.name)
  }


  const tabs = [
    {
      id: 0,
      label: "commands",
      content: (
        <Card className="flex flex-col border-border bg-card h-full">
          <CardHeader className="border-b border-border shrink-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <TerminalIcon className="size-4 text-primary" />
              {selectedRepo || "No Repository Selected"}
            </CardTitle>
            {selectedRepo && (
              <CardAction>
                <div className="flex gap-2">
                  <QuickComposer
                    repoName={selectedRepo}
                    onRunCommand={handleRunCommandInput}
                    onAddCommand={addCommand}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border bg-card"
                    >
                      <Plus data-icon="inline-start" className="size-4 mr-2" />
                      Add command
                    </Button>
                  </QuickComposer>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border bg-card"
                    onClick={() => stopAllForRepo(selectedRepo)}
                  >
                    <Square data-icon="inline-start" className="size-4 mr-2" />
                    Stop all
                  </Button>
                </div>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3 py-4 overflow-y-auto flex-1">
            {selectedRepo ? (
              filteredCommands.length > 0 ? (
                filteredCommands.map((command, index) => (
                  <CommandCard
                    key={`${command.repo}-${command.name}`}
                    command={command}
                    index={index}
                    onRun={handleRunCommand}
                    onDelete={handleDeleteCommand}
                    onUpdateCommand={updateCommand}
                  />
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No commands found for this repository.
                </div>
              )
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a repository to view commands.
              </div>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: 1,
      label: "pipelines",
      content: (
        <Card className="flex flex-col border-border bg-card h-full">
          <CardContent className="flex items-center justify-center h-full text-muted-foreground">
            Pipelines coming soon...
          </CardContent>
        </Card>
      )
    }
  ]
  return (
    <Drawer direction="right" open={terminalDrawerOpen} onOpenChange={setTerminalDrawerOpen}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:rounded-l-4xl bg-card h-full w-[500px] p-2 pt-4 right-0 left-auto mt-0 rounded-none">
        <DirectionAwareTabs tabs={tabs} />
      </DrawerContent>
    </Drawer>
  )
}
