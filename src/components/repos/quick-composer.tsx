import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Play, Plus } from "lucide-react"
import { CommandForm } from "./command-form"
import { SaveCommandDialog } from "./save-command-dialog"
import type { Command, CommandType, RunCommandInput } from "./types"

interface QuickComposerProps {
  repoName: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onRunCommand?: (request: RunCommandInput) => void | Promise<void>
  onAddCommand?: (command: Command) => void | Promise<void>
  onUpdateCommand?: (command: Command) => void | Promise<void>
  editingCommand?: Command
  inline?: boolean
}

interface FormState {
  commandName: string
  baseCommand: string
  args: string
  notes: string
  commandType: CommandType
}

const initialFormState: FormState = {
  commandName: "",
  baseCommand: "pnpm run",
  args: "",
  notes: "",
  commandType: "run",
}

export function QuickComposer({
  repoName,
  open = true,
  onOpenChange,
  onRunCommand,
  onAddCommand,
  onUpdateCommand,
  editingCommand,
  inline = false,
}: QuickComposerProps) {
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const composedCommand = useMemo(() => {
    const base = formState.baseCommand.trim()
    const extras = formState.args.trim()
    return [base, extras].filter(Boolean).join(" ")
  }, [formState.baseCommand, formState.args])

  const isValid = useMemo(() => {
    return Boolean(repoName?.trim() && composedCommand.trim())
  }, [repoName, composedCommand])

  const handleRun = () => {
    if (!isValid) return
    const request: RunCommandInput = {
      repo: repoName,
      command: composedCommand,
      commandType: formState.commandType,
    }
    if (formState.commandName.trim()) {
      request.name = formState.commandName.trim()
    }
    onRunCommand?.(request)
  }

  const handleSaveClick = () => {
    if (!isValid) return
    setSaveDialogOpen(true)
  }

  const handleSave = () => {
    if (!isValid || !formState.commandName.trim()) return

    const commandToSave: Command = {
      name: formState.commandName.trim(),
      command: composedCommand,
      type: editingCommand?.type || formState.commandType,
      status: editingCommand?.status || "idle",
      duration: editingCommand?.duration || "-",
      lastRun: editingCommand?.lastRun || "-",
      repo: editingCommand?.repo || repoName,
    }

    if (editingCommand && onUpdateCommand) {
      onUpdateCommand(commandToSave)
    } else if (onAddCommand) {
      onAddCommand(commandToSave)
    }

    setSaveDialogOpen(false)
    if (!editingCommand) {
      setFormState(initialFormState)
    }
    if (!inline) {
      onOpenChange?.(false)
    }
  }

  const resetForm = () => {
    setFormState(initialFormState)
  }

  useEffect(() => {
    if (editingCommand) {
      // Simple parsing: split command into base and args
      const parts = editingCommand.command.trim().split(/\s+/)
      if (parts.length > 0) {
        // For package managers, include "run" if present
        const packageManagers = ["pnpm", "npm", "yarn"]
        const hasPackageManager = packageManagers.includes(parts[0])
        const hasRun = parts.length > 1 && parts[1] === "run"

        let baseEndIndex = 1
        if (hasPackageManager && hasRun) {
          baseEndIndex = 2
        } else if (hasPackageManager) {
          baseEndIndex = 1
        } else {
          baseEndIndex = Math.min(2, parts.length)
        }

        setFormState({
          commandName: editingCommand.name,
          baseCommand: parts.slice(0, baseEndIndex).join(" "),
          args: parts.slice(baseEndIndex).join(" "),
          notes: "",
          commandType: editingCommand.type,
        })
      } else {
        setFormState({
          commandName: editingCommand.name,
          baseCommand: editingCommand.command,
          args: "",
          notes: "",
          commandType: editingCommand.type,
        })
      }
    } else if (!open && !inline) {
      resetForm()
    }
  }, [editingCommand, open, inline])

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const content = (
    <CommandForm
      repoName={repoName}
      commandName={formState.commandName}
      baseCommand={formState.baseCommand}
      args={formState.args}
      notes={formState.notes}
      onCommandNameChange={(value) => updateField("commandName", value)}
      onBaseCommandChange={(value) => updateField("baseCommand", value)}
      onArgsChange={(value) => updateField("args", value)}
      onNotesChange={(value) => updateField("notes", value)}
      onTemplateApply={(data) => {
        updateField("commandName", data.commandName)
        updateField("baseCommand", data.baseCommand)
        updateField("args", data.args)
        updateField("commandType", data.commandType)
      }}
    />
  )

  const footer = (
    <div className="flex gap-2 justify-end">
      {!inline && (
        <Button variant="outline" onClick={() => onOpenChange?.(false)}>
          Cancel
        </Button>
      )}
      <Button variant="outline" onClick={handleRun} disabled={!isValid}>
        <Play className="mr-2 size-4" />
        Run now
      </Button>
      <Button
        variant="default"
        onClick={handleSaveClick}
        disabled={
          !isValid ||
          (!onAddCommand && !onUpdateCommand) ||
          (editingCommand && !onUpdateCommand) ||
          (!editingCommand && !onAddCommand)
        }
      >
        <Plus className="mr-2 size-4" />
        {editingCommand ? "Update command" : "Save command"}
      </Button>
    </div>
  )

  if (inline) {
    return (
      <>
        {content}
        {footer}
        <SaveCommandDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          commandName={formState.commandName}
          onCommandNameChange={(value) => updateField("commandName", value)}
          composedCommand={composedCommand}
          repoName={repoName}
          editingCommand={!!editingCommand}
          onSave={handleSave}
        />
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editingCommand ? "Edit command" : "Quick composer"}
            </DialogTitle>
            <DialogDescription>
              {editingCommand
                ? `Edit ${editingCommand.name} command.`
                : repoName
                ? `Build custom commands for ${repoName}.`
                : "Select a repository to build custom commands."}
            </DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleRun} disabled={!isValid}>
              <Play className="mr-2 size-4" />
              Run now
            </Button>
            <Button
              variant="default"
              onClick={handleSaveClick}
              disabled={
                !isValid ||
                (!onAddCommand && !onUpdateCommand) ||
                (editingCommand && !onUpdateCommand) ||
                (!editingCommand && !onAddCommand)
              }
            >
              <Plus className="mr-2 size-4" />
              {editingCommand ? "Update command" : "Save command"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveCommandDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        commandName={formState.commandName}
        onCommandNameChange={(value) => updateField("commandName", value)}
        composedCommand={composedCommand}
        repoName={repoName}
        editingCommand={!!editingCommand}
        onSave={handleSave}
      />
    </>
  )
}
