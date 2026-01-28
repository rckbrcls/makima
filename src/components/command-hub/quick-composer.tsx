import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { frameworks } from "@/lib/command-hub/data/framework-commands"
import type { Command, RunCommandInput } from "./types"

interface QuickComposerProps {
  repoName: string
  onRunCommand?: (request: RunCommandInput) => void | Promise<void>
  onAddCommand?: (command: Command) => void | Promise<void>
}

export function QuickComposer({
  repoName,
  onRunCommand,
  onAddCommand,
}: QuickComposerProps) {
  const [baseCommand, setBaseCommand] = useState("pnpm run")
  const [args, setArgs] = useState("")
  const [notes, setNotes] = useState("")
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [commandName, setCommandName] = useState("")
  const [selectedFramework, setSelectedFramework] = useState<string>("custom")
  const [selectedCommand, setSelectedCommand] = useState<string>("custom")

  const composedCommand = useMemo(() => {
    const base = baseCommand.trim()
    const extras = args.trim()
    return [base, extras].filter(Boolean).join(" ")
  }, [baseCommand, args])

  const isValid = useMemo(() => {
    return Boolean(repoName?.trim() && composedCommand.trim())
  }, [repoName, composedCommand])

  const selectedFrameworkData = useMemo(() => {
    return frameworks.find((f) => f.id === selectedFramework)
  }, [selectedFramework])

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
    // Se já houver um nome preenchido, manter; caso contrário, limpar para o usuário preencher
    setSaveDialogOpen(true)
  }

  const handleSave = () => {
    if (!isValid || !commandName.trim() || !onAddCommand) return
    onAddCommand({
      name: commandName.trim(),
      command: composedCommand,
      type: selectedCommandData?.commandType || "run",
      status: "idle",
      duration: "-",
      lastRun: "-",
      repo: repoName,
    })
    setSaveDialogOpen(false)
    setCommandName("")
  }

  const handleFrameworkChange = (frameworkId: string) => {
    setSelectedFramework(frameworkId)
    setSelectedCommand("custom")
    // Limpar campos quando mudar de framework
    if (frameworkId === "custom") {
      setCommandName("")
      setBaseCommand("pnpm run")
      setArgs("")
    }
  }

  const handleCommandChange = (commandId: string) => {
    setSelectedCommand(commandId)
    if (commandId === "custom" || !selectedFrameworkData) {
      return
    }
    const command = selectedFrameworkData.commands.find((c) => c.id === commandId)
    if (command) {
      setCommandName(command.commandName)
      setBaseCommand(command.baseCommand)
      setArgs(command.args)
    }
  }

  const handleCommandNameChange = (value: string) => {
    setCommandName(value)
    // Se o usuário editar manualmente, resetar os selects para custom
    if (selectedCommand !== "custom") {
      setSelectedCommand("custom")
    }
  }

  const handleBaseCommandChange = (value: string) => {
    setBaseCommand(value)
    // Se o usuário editar manualmente, resetar os selects para custom
    if (selectedCommand !== "custom") {
      setSelectedCommand("custom")
    }
  }

  const handleArgsChange = (value: string) => {
    setArgs(value)
    // Se o usuário editar manualmente, resetar os selects para custom
    if (selectedCommand !== "custom") {
      setSelectedCommand("custom")
    }
  }

  return (
    <>
      <Card className="shrink-0 border-border/60 bg-card/85">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-sm">Quick composer</CardTitle>
          <CardDescription>
            {repoName
              ? `Build custom commands for ${repoName}.`
              : "Select a repository to build custom commands."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid min-h-0 gap-3 sm:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            {!repoName && (
              <div className="rounded-none border border-destructive/30 bg-destructive/10 p-2 text-[0.65rem] text-destructive">
                No repository selected. Please select a repository to continue.
              </div>
            )}
            <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              framework
            </label>
            <Select
              value={selectedFramework}
              onValueChange={handleFrameworkChange}
              disabled={!repoName}
            >
              <SelectTrigger className="h-9 border-border bg-background/80 text-xs">
                <SelectValue placeholder="Select a framework (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                {frameworks.map((framework) => (
                  <SelectItem key={framework.id} value={framework.id}>
                    {framework.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              command
            </label>
            <Select
              value={selectedCommand}
              onValueChange={handleCommandChange}
              disabled={!repoName || selectedFramework === "custom"}
            >
              <SelectTrigger className="h-9 border-border bg-background/80 text-xs">
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-card/70"
                onClick={handleRun}
                disabled={!isValid}
              >
                <Play data-icon="inline-start" />
                Run now
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-card/70"
                onClick={handleSaveClick}
                disabled={!isValid || !onAddCommand}
              >
                <Plus data-icon="inline-start" />
                Save command
              </Button>
            </div>
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
        </CardContent>
      </Card>

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
