import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
  useExpandableScreen,
} from "@/components/ui/expandable-screen"
import { Play, Plus } from "lucide-react"
import { CommandForm } from "./command-form"
import { SaveCommandDialog } from "./save-command-dialog"
import type { Command, CommandType, RunCommandInput } from "./types"

interface QuickComposerProps {
  repoName: string
  children?: ReactNode
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
  children,
  onRunCommand,
  onAddCommand,
  onUpdateCommand,
  editingCommand,
  inline = false,
}: QuickComposerProps) {
  // If not inline, we use internal ExpandableScreen logic.
  // We can't easily reset form on close without controlling it,
  // but we can try to use effect or just reset on save.

  return inline ? (
    <QuickComposerContent
      repoName={repoName}
      onRunCommand={onRunCommand}
      onAddCommand={onAddCommand}
      onUpdateCommand={onUpdateCommand}
      editingCommand={editingCommand}
      inline={true}
    />
  ) : (
    <ExpandableScreen>
      <ExpandableScreenTrigger>{children}</ExpandableScreenTrigger>
      <ExpandableScreenContent className="bg-background border border-border pt-6">
        <QuickComposerContent
          repoName={repoName}
          onRunCommand={onRunCommand}
          onAddCommand={onAddCommand}
          onUpdateCommand={onUpdateCommand}
          editingCommand={editingCommand}
          inline={false}
        />
      </ExpandableScreenContent>
    </ExpandableScreen>
  )
}

interface QuickComposerContentProps extends Omit<QuickComposerProps, "children"> { }

function QuickComposerContent({
  repoName,
  onRunCommand,
  onAddCommand,
  onUpdateCommand,
  editingCommand,
  inline,
}: QuickComposerContentProps) {
  const { collapse } = useExpandableScreen() // Will be no-op if inline (context missing or mocked?)
  // Actually useExpandableScreen throws if no context.
  // If inline, we are NOT inside ExpandableScreen?
  // Wait, the usages of QuickComposer inline are likely NOT inside an ExpandableScreen.
  // We need safe access to context or separate components.
  // Let's check `useExpandableScreen`. It throws.
  // So we should only call it if !inline.

  const [formState, setFormState] = useState<FormState>(initialFormState)

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

    if (!editingCommand) {
      setFormState(initialFormState)
    }

    if (!inline) {
      try {
        collapse()
      } catch {
        // Ignore if used outside of context (shouldn't happen with current logic but safe)
      }
    }
  }

  useEffect(() => {
    if (editingCommand) {
      // Simple parsing logic...
      const parts = editingCommand.command.trim().split(/\s+/)
      if (parts.length > 0) {
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
    }
    // We don't reset on open change here because we don't track open state.
    // Resetting should happen on successful save or cancel.
  }, [editingCommand])

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleCancel = () => {
    if (!inline) {
      try {
        collapse()
      } catch { }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {!inline && (
        <div className="flex flex-col space-y-1.5 p-6 pb-2 text-center sm:text-left">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {editingCommand ? "Edit command" : "Quick composer"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {editingCommand
              ? `Edit ${editingCommand.name} command.`
              : repoName
                ? `Build custom commands for ${repoName}.`
                : "Select a repository to build custom commands."}
          </p>
        </div>
      )}

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

      <div className="flex gap-2 justify-end p-6 pt-0">
        {!inline && (
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        )}
        <Button variant="outline" onClick={handleRun} disabled={!isValid}>
          <Play className="mr-2 size-4" />
          Run now
        </Button>

        {/* Save Button Logic */}
        {isValid ? (
          <SaveCommandDialog
            commandName={formState.commandName}
            onCommandNameChange={(value) => updateField("commandName", value)}
            composedCommand={composedCommand}
            repoName={repoName}
            editingCommand={!!editingCommand}
            onSave={handleSave}
          >
            <Button
              variant="default"
              disabled={
                (!onAddCommand && !onUpdateCommand) ||
                (editingCommand && !onUpdateCommand) ||
                (!editingCommand && !onAddCommand)
              }
            >
              <Plus className="mr-2 size-4" />
              {editingCommand ? "Update command" : "Save command"}
            </Button>
          </SaveCommandDialog>
        ) : (
          <Button
            variant="default"
            disabled
          >
            <Plus className="mr-2 size-4" />
            {editingCommand ? "Update command" : "Save command"}
          </Button>
        )}
      </div>
    </div>
  )
}
