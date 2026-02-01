import { Button } from "@/components/ui/button"
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
  useExpandableScreen,
} from "@/components/ui/expandable-screen"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type ReactNode } from "react"

interface SaveCommandDialogProps {
  children?: ReactNode
  commandName: string
  onCommandNameChange: (value: string) => void
  composedCommand: string
  repoName: string
  editingCommand?: boolean
  onSave: () => void
}

export function SaveCommandDialog({
  children,
  commandName,
  onCommandNameChange,
  composedCommand,
  repoName,
  editingCommand = false,
  onSave,
}: SaveCommandDialogProps) {
  return (
    <ExpandableScreen>
      <ExpandableScreenTrigger>{children}</ExpandableScreenTrigger>
      <ExpandableScreenContent className="bg-background border border-border p-0 sm:max-w-md">
        <SaveCommandForm
          commandName={commandName}
          onCommandNameChange={onCommandNameChange}
          composedCommand={composedCommand}
          repoName={repoName}
          editingCommand={editingCommand}
          onSave={onSave}
        />
      </ExpandableScreenContent>
    </ExpandableScreen>
  )
}

function SaveCommandForm({
  commandName,
  onCommandNameChange,
  composedCommand,
  repoName,
  editingCommand,
  onSave,
}: Omit<SaveCommandDialogProps, "children">) {
  const { collapse } = useExpandableScreen()

  const handleSave = () => {
    onSave()
    collapse()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col space-y-1.5 p-6 pb-2 text-center sm:text-left">
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          {editingCommand ? "Update Command" : "Save Command"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {editingCommand
            ? "Update the command details."
            : "Enter a name for this command to save it for future use."}
        </p>
      </div>

      <div className="space-y-4 p-6 pt-2">
        <div className="space-y-2">
          <Label htmlFor="command-name">Command Name</Label>
          <Input
            id="command-name"
            value={commandName}
            onChange={(event) => onCommandNameChange(event.target.value)}
            placeholder="e.g., build-desktop"
            onKeyDown={(event) => {
              if (event.key === "Enter" && commandName.trim()) {
                handleSave()
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Command</Label>
          <div className="rounded-none border border-border/70 bg-muted/30 p-2 text-xs font-mono">
            {composedCommand || "(empty)"}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Repository</Label>
          <div className="rounded-none border border-border/70 bg-muted/30 p-2 text-xs">
            {repoName}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2">
          <Button variant="outline" onClick={() => collapse()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!commandName.trim()}>
            {editingCommand ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
