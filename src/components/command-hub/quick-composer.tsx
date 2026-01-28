import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Play, Plus } from "lucide-react"
import {
  languages,
  replacePackageManager,
} from "@/lib/command-hub/data/framework-commands"
import type { Command, RunCommandInput } from "./types"

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
  const [baseCommand, setBaseCommand] = useState("pnpm run")
  const [args, setArgs] = useState("")
  const [notes, setNotes] = useState("")
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [commandName, setCommandName] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<string>("custom")
  const [selectedFramework, setSelectedFramework] = useState<string>("custom")
  const [selectedPackageManager, setSelectedPackageManager] = useState<
    "pnpm" | "npm" | "yarn"
  >("pnpm")
  const [selectedCommand, setSelectedCommand] = useState<string>("custom")

  const composedCommand = useMemo(() => {
    const base = baseCommand.trim()
    const extras = args.trim()
    return [base, extras].filter(Boolean).join(" ")
  }, [baseCommand, args])

  const isValid = useMemo(() => {
    return Boolean(repoName?.trim() && composedCommand.trim())
  }, [repoName, composedCommand])

  const selectedLanguageData = useMemo(() => {
    return languages.find((l) => l.id === selectedLanguage)
  }, [selectedLanguage])

  const availableFrameworks = useMemo(() => {
    if (!selectedLanguageData) return []
    return selectedLanguageData.frameworks
  }, [selectedLanguageData])

  const selectedFrameworkData = useMemo(() => {
    if (!selectedLanguageData || selectedFramework === "custom") return null
    return selectedLanguageData.frameworks.find(
      (f) => f.id === selectedFramework
    )
  }, [selectedLanguageData, selectedFramework])

  const availableCommands = useMemo(() => {
    if (!selectedFrameworkData) return []
    return selectedFrameworkData.commands
  }, [selectedFrameworkData])

  const selectedCommandData = useMemo(() => {
    if (!selectedFrameworkData || selectedCommand === "custom") return null
    return selectedFrameworkData.commands.find((c) => c.id === selectedCommand)
  }, [selectedFrameworkData, selectedCommand])

  const handleRun = () => {
    if (!isValid) return
    const request: RunCommandInput = {
      repo: repoName,
      command: composedCommand,
      commandType: selectedCommandData?.commandType || "run",
    }
    if (commandName.trim()) {
      request.name = commandName.trim()
    }
    onRunCommand?.(request)
  }

  const handleSaveClick = () => {
    if (!isValid) return
    setSaveDialogOpen(true)
  }

  const handleSave = () => {
    if (!isValid || !commandName.trim()) return
    
    const commandToSave: Command = {
      name: commandName.trim(),
      command: composedCommand,
      type: selectedCommandData?.commandType || editingCommand?.type || "run",
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
      setCommandName("")
    }
    if (!inline) {
      onOpenChange?.(false)
    }
    if (!editingCommand) {
      resetFields()
    }
  }

  const resetFields = () => {
    setBaseCommand("pnpm run")
    setArgs("")
    setNotes("")
    setSelectedLanguage("custom")
    setSelectedFramework("custom")
    setSelectedPackageManager("pnpm")
    setSelectedCommand("custom")
  }

  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguage(languageId)
    setSelectedFramework("custom")
    setSelectedPackageManager("pnpm")
    setSelectedCommand("custom")
    if (languageId === "custom") {
      setCommandName("")
      setBaseCommand("pnpm run")
      setArgs("")
    }
  }

  const handleFrameworkChange = (frameworkId: string) => {
    setSelectedFramework(frameworkId)
    setSelectedCommand("custom")
    if (frameworkId === "custom" || !selectedLanguageData) {
      setCommandName("")
      setBaseCommand("pnpm run")
      setArgs("")
      return
    }
    const framework = selectedLanguageData.frameworks.find(
      (f) => f.id === frameworkId
    )
    if (framework && framework.requiresPackageManager) {
      setSelectedPackageManager("pnpm")
    }
  }

  const handlePackageManagerChange = (
    packageManager: "pnpm" | "npm" | "yarn"
  ) => {
    setSelectedPackageManager(packageManager)
    // Se houver um comando selecionado, atualizar o baseCommand
    if (selectedCommand !== "custom" && selectedCommandData) {
      const updatedCommand = replacePackageManager(
        selectedCommandData.baseCommand,
        packageManager
      )
      setBaseCommand(updatedCommand)
    }
  }

  const handleCommandChange = (commandId: string) => {
    setSelectedCommand(commandId)
    if (commandId === "custom" || !selectedFrameworkData) {
      return
    }
    const command = selectedFrameworkData.commands.find(
      (c) => c.id === commandId
    )
    if (command) {
      setCommandName(command.commandName)
      // Aplicar substituição de package manager se necessário
      if (
        selectedFrameworkData.requiresPackageManager &&
        selectedPackageManager
      ) {
        const updatedCommand = replacePackageManager(
          command.baseCommand,
          selectedPackageManager
        )
        setBaseCommand(updatedCommand)
      } else {
        setBaseCommand(command.baseCommand)
      }
      setArgs(command.args)
    }
  }

  const handleCommandNameChange = (value: string) => {
    setCommandName(value)
    if (selectedCommand !== "custom") {
      setSelectedCommand("custom")
    }
  }

  const handleBaseCommandChange = (value: string) => {
    setBaseCommand(value)
    if (selectedCommand !== "custom") {
      setSelectedCommand("custom")
    }
  }

  const handleArgsChange = (value: string) => {
    setArgs(value)
    if (selectedCommand !== "custom") {
      setSelectedCommand("custom")
    }
  }

  useEffect(() => {
    if (editingCommand) {
      setCommandName(editingCommand.name)
      
      // Parse command to separate baseCommand and args
      // Simple approach: split by first space after the base command pattern
      const commandParts = editingCommand.command.trim().split(/\s+/)
      if (commandParts.length > 0) {
        // Try to identify common base commands (pnpm, npm, yarn, etc.)
        const basePatterns = ["pnpm", "npm", "yarn", "node", "python", "python3", "go", "cargo", "make"]
        let baseEndIndex = 1
        
        // If starts with package manager, include "run" if present
        if (basePatterns.includes(commandParts[0]) && commandParts.length > 1 && commandParts[1] === "run") {
          baseEndIndex = 2
        } else if (basePatterns.includes(commandParts[0])) {
          baseEndIndex = 1
        } else {
          // Default: first two words as base (e.g., "pnpm run")
          baseEndIndex = Math.min(2, commandParts.length)
        }
        
        setBaseCommand(commandParts.slice(0, baseEndIndex).join(" "))
        setArgs(commandParts.slice(baseEndIndex).join(" "))
      } else {
        setBaseCommand(editingCommand.command)
        setArgs("")
      }
      
      // Set command type based on editingCommand.type
      setSelectedCommand("custom")
      
      // Reset template selections when editing
      setSelectedLanguage("custom")
      setSelectedFramework("custom")
      setSelectedPackageManager("pnpm")
    } else if (!open && !inline) {
      // Only reset if not editing and dialog is closed
      resetFields()
    }
  }, [editingCommand, open, inline])

  const content = (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {!repoName && (
            <div className="rounded-none border border-destructive/30 bg-destructive/10 p-2 text-[0.65rem] text-destructive">
              No repository selected. Please select a repository to continue.
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    language
                  </label>
                  <Select
                    value={selectedLanguage}
                    onValueChange={handleLanguageChange}
                    disabled={!repoName}
                  >
                    <SelectTrigger className="h-9 w-full border-border bg-background/80 text-xs">
                      <SelectValue placeholder="Select a language (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      {languages.map((language) => (
                        <SelectItem key={language.id} value={language.id}>
                          {language.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    framework
                  </label>
                  <Select
                    value={selectedFramework}
                    onValueChange={handleFrameworkChange}
                    disabled={!repoName || selectedLanguage === "custom"}
                  >
                    <SelectTrigger className="h-9 w-full border-border bg-background/80 text-xs">
                      <SelectValue
                        placeholder={
                          selectedLanguage === "custom"
                            ? "Select a language first"
                            : "Select a framework (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      {availableFrameworks.map((framework) => (
                        <SelectItem key={framework.id} value={framework.id}>
                          {framework.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedFrameworkData?.requiresPackageManager ? (
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                      package manager
                    </label>
                    <Select
                      value={selectedPackageManager}
                      onValueChange={handlePackageManagerChange}
                      disabled={!repoName || selectedFramework === "custom"}
                    >
                      <SelectTrigger className="h-9 w-full border-border bg-background/80 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pnpm">pnpm</SelectItem>
                        <SelectItem value="npm">npm</SelectItem>
                        <SelectItem value="yarn">yarn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                      package manager
                    </label>
                    <div className="h-9 w-full border-border bg-background/80 text-xs flex items-center px-3 rounded-none border text-muted-foreground">
                      Not required
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2 mt-4">
                <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                  command
                </label>
                <Select
                  value={selectedCommand}
                  onValueChange={handleCommandChange}
                  disabled={!repoName || selectedFramework === "custom"}
                >
                  <SelectTrigger className="h-9 w-full border-border bg-background/80 text-xs">
                    <SelectValue
                      placeholder={
                        selectedFramework === "custom"
                          ? "Select a framework first"
                          : "Select a command (optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    {availableCommands.map((command) => (
                      <SelectItem key={command.id} value={command.id}>
                        {command.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <div className="grid min-h-0 gap-4 sm:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
            <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              command name
            </label>
            <Input
              className="h-9 border-border bg-background/80 text-xs"
              placeholder="Optional: e.g., build-desktop"
              value={commandName}
              onChange={(event) => handleCommandNameChange(event.target.value)}
              disabled={!repoName}
            />
            <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              base command
            </label>
            <Input
              className="h-9 border-border bg-background/80 text-xs"
              value={baseCommand}
              onChange={(event) => handleBaseCommandChange(event.target.value)}
              disabled={!repoName}
            />
            <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              arguments
            </label>
            <Input
              className="h-9 border-border bg-background/80 text-xs"
              placeholder="build --filter=desktop"
              value={args}
              onChange={(event) => handleArgsChange(event.target.value)}
              disabled={!repoName}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              notes and variables
            </label>
            <Textarea
              className="min-h-[124px] border-border bg-background/80 text-xs"
              placeholder="ENV=production\nCACHE=false\n"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!repoName}
            />
            <div className="rounded-none border border-border/70 bg-accent/60 p-3 text-[0.65rem] text-muted-foreground">
              Tip: use {"{{repo}}"} and {"{{branch}}"} to inject context in
              real-time.
            </div>
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
        disabled={!isValid || (!onAddCommand && !onUpdateCommand) || (editingCommand && !onUpdateCommand) || (!editingCommand && !onAddCommand)}
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
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCommand ? "Update Command" : "Save Command"}</DialogTitle>
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
                  onChange={(event) => setCommandName(event.target.value)}
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!commandName.trim()}>
                {editingCommand ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingCommand ? "Edit command" : "Quick composer"}</DialogTitle>
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
            <Button
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button variant="outline" onClick={handleRun} disabled={!isValid}>
              <Play className="mr-2 size-4" />
              Run now
            </Button>
            <Button
              variant="default"
              onClick={handleSaveClick}
              disabled={!isValid || (!onAddCommand && !onUpdateCommand) || (editingCommand && !onUpdateCommand) || (!editingCommand && !onAddCommand)}
            >
              <Plus className="mr-2 size-4" />
              {editingCommand ? "Update command" : "Save command"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Command</DialogTitle>
            <DialogDescription>
              Enter a name for this command to save it for future use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="command-name">Command Name</Label>
              <Input
                id="command-name"
                value={commandName}
                onChange={(event) => setCommandName(event.target.value)}
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!commandName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
