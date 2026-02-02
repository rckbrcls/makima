import { Plus, Square, Terminal as TerminalIcon } from "lucide-react";
import { DirectionAwareTabs } from "../ui/direction-aware-tabs";
import type { Command, RunCommandInput } from "@/components/repos/types";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useUIStore } from "@/stores/ui-store";
import { useCommandStore } from "@/stores/command-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommandCard } from "@/components/repos/command-card";
import { QuickComposer } from "@/components/repos/quick-composer";
import { filterByRepo } from "@/lib/command-hub/helpers";

export function TerminalDrawer() {
  const { terminalDrawerOpen, setTerminalDrawerOpen, selectedRepo } =
    useUIStore();

  const {
    commands,
    runCommand,
    stopCommand,
    addCommand,
    updateCommand,
    deleteCommand,
  } = useCommandStore();

  // Ensure commands is typed as Command[]
  const filteredCommands = filterByRepo<Command>(commands, selectedRepo);

  const stopAllForRepo = (repo: string | null) => {
    if (!repo) return;
    const repoCommands = filteredCommands.filter((c) => c.status === "running");
    repoCommands.forEach((c) => {
      stopCommand({ repo, command: c.name });
    });
  };

  const handleRunCommand = (command: Command) => {
    runCommand({
      repo: command.repo,
      name: command.name,
      command: command.command,
      commandType: command.type,
    });
  };

  const handleRunCommandInput = (input: RunCommandInput) => {
    runCommand(input);
  };

  const handleDeleteCommand = (command: Command) => {
    deleteCommand(command.repo, command.name);
  };

  const tabs = [
    {
      id: 0,
      label: "commands",
      content: (
        <Card className="border-border bg-card flex h-full flex-col">
          <CardHeader className="border-border shrink-0 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <TerminalIcon className="text-primary size-4" />
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
                      <Plus data-icon="inline-start" className="mr-2 size-4" />
                      Add command
                    </Button>
                  </QuickComposer>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border bg-card"
                    onClick={() => stopAllForRepo(selectedRepo)}
                  >
                    <Square data-icon="inline-start" className="mr-2 size-4" />
                    Stop all
                  </Button>
                </div>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
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
                <div className="text-muted-foreground py-8 text-center">
                  No commands found for this repository.
                </div>
              )
            ) : (
              <div className="text-muted-foreground py-8 text-center">
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
        <Card className="border-border bg-card flex h-full flex-col">
          <CardContent className="text-muted-foreground flex h-full items-center justify-center">
            Pipelines coming soon...
          </CardContent>
        </Card>
      ),
    },
  ];
  return (
    <Drawer
      direction="right"
      open={terminalDrawerOpen}
      onOpenChange={setTerminalDrawerOpen}
    >
      <DrawerContent className="bg-card right-0 left-auto mt-0 h-full w-[500px] rounded-none p-2 pt-4 data-[vaul-drawer-direction=right]:rounded-l-4xl">
        <DirectionAwareTabs tabs={tabs} />
      </DrawerContent>
    </Drawer>
  );
}
