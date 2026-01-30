import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SaveCommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commandName: string
  onCommandNameChange: (value: string) => void
  composedCommand: string
  repoName: string
  editingCommand?: boolean
  onSave: () => void
}

export function SaveCommandDialog({
  open,
  onOpenChange,
  commandName,
  onCommandNameChange,
  composedCommand,
  repoName,
  editingCommand = false,
  onSave,
}: SaveCommandDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCommand ? "Update Command" : "Save Command"}
          </DialogTitle>
          <DialogDescription>
            {editingCommand
              ? "Update the command details."
              : "Enter a name for this command to save it for future use."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="command-name">Command Name</Label>
            <Input
              id="command-name"
              value={commandName}
              onChange={(event) => onCommandNameChange(event.target.value)}
              placeholder="e.g., build-desktop"
              onKeyDown={(event) => {
                if (event.key === "Enter" && commandName.trim()) {
                  onSave()
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!commandName.trim()}>
            {editingCommand ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
