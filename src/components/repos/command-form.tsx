import type { CommandType } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { languages } from "@/lib/command-hub/data/framework-commands";
import { useTemplateSelector } from "@/hooks/use-template-selector";

interface CommandFormProps {
  repoName: string;
  commandName: string;
  baseCommand: string;
  args: string;
  notes: string;
  onCommandNameChange: (value: string) => void;
  onBaseCommandChange: (value: string) => void;
  onArgsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onTemplateApply?: (data: {
    commandName: string;
    baseCommand: string;
    args: string;
    commandType: CommandType;
  }) => void;
}

export function CommandForm({
  repoName,
  commandName,
  baseCommand,
  args,
  notes,
  onCommandNameChange,
  onBaseCommandChange,
  onArgsChange,
  onNotesChange,
  onTemplateApply,
}: CommandFormProps) {
  const template = useTemplateSelector();

  const handleLanguageChange = (languageId: string) => {
    template.setLanguage(languageId);
    if (languageId === "custom") {
      onCommandNameChange("");
      onBaseCommandChange("pnpm run");
      onArgsChange("");
    }
  };

  const handleFrameworkChange = (frameworkId: string) => {
    template.setFramework(frameworkId);
    if (frameworkId === "custom" || !template.selectedLanguageData) {
      onCommandNameChange("");
      onBaseCommandChange("pnpm run");
      onArgsChange("");
      return;
    }
    if (template.selectedFrameworkData?.requiresPackageManager) {
      template.setPackageManager("pnpm");
    }
  };

  const handlePackageManagerChange = (
    packageManager: "pnpm" | "npm" | "yarn",
  ) => {
    template.setPackageManager(packageManager);
    if (template.state.command !== "custom" && template.selectedCommandData) {
      const applied = template.applyCommand();
      if (applied) {
        onBaseCommandChange(applied.baseCommand);
      }
    }
  };

  const handleCommandChange = (commandId: string) => {
    template.setCommand(commandId);
    if (commandId === "custom" || !template.selectedFrameworkData) {
      return;
    }
    const applied = template.applyCommand();
    if (applied) {
      onCommandNameChange(applied.commandName);
      onBaseCommandChange(applied.baseCommand);
      onArgsChange(applied.args);
      onTemplateApply?.({
        commandName: applied.commandName,
        baseCommand: applied.baseCommand,
        args: applied.args,
        commandType: applied.commandType,
      });
    }
  };

  const handleFieldChange = (
    field: "commandName" | "baseCommand" | "args",
    value: string,
  ) => {
    if (template.state.command !== "custom") {
      template.setCommand("custom");
    }
    if (field === "commandName") {
      onCommandNameChange(value);
    } else if (field === "baseCommand") {
      onBaseCommandChange(value);
    } else {
      onArgsChange(value);
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {!repoName && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-none border p-2 text-[0.65rem]">
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
                  <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                    language
                  </label>
                  <Select
                    value={template.state.language}
                    onValueChange={handleLanguageChange}
                    disabled={!repoName}
                  >
                    <SelectTrigger className="border-border bg-card h-9 w-full text-xs">
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
                  <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                    framework
                  </label>
                  <Select
                    value={template.state.framework}
                    onValueChange={handleFrameworkChange}
                    disabled={!repoName || template.state.language === "custom"}
                  >
                    <SelectTrigger className="border-border bg-card h-9 w-full text-xs">
                      <SelectValue
                        placeholder={
                          template.state.language === "custom"
                            ? "Select a language first"
                            : "Select a framework (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      {template.availableFrameworks.map((framework) => (
                        <SelectItem key={framework.id} value={framework.id}>
                          {framework.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {template.selectedFrameworkData?.requiresPackageManager ? (
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                      package manager
                    </label>
                    <Select
                      value={template.state.packageManager}
                      onValueChange={handlePackageManagerChange}
                      disabled={
                        !repoName || template.state.framework === "custom"
                      }
                    >
                      <SelectTrigger className="border-border bg-card h-9 w-full text-xs">
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
                    <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                      package manager
                    </label>
                    <div className="border-border bg-card text-muted-foreground flex h-9 w-full items-center rounded-none border px-3 text-xs">
                      Not required
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                  command
                </label>
                <Select
                  value={template.state.command}
                  onValueChange={handleCommandChange}
                  disabled={!repoName || template.state.framework === "custom"}
                >
                  <SelectTrigger className="border-border bg-card h-9 w-full text-xs">
                    <SelectValue
                      placeholder={
                        template.state.framework === "custom"
                          ? "Select a framework first"
                          : "Select a command (optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    {template.availableCommands.map((command) => (
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
              <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                command name
              </label>
              <Input
                className="border-border bg-card h-9 text-xs"
                placeholder="Optional: e.g., build-desktop"
                value={commandName}
                onChange={(event) =>
                  handleFieldChange("commandName", event.target.value)
                }
                disabled={!repoName}
              />
              <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                base command
              </label>
              <Input
                className="border-border bg-card h-9 text-xs"
                value={baseCommand}
                onChange={(event) =>
                  handleFieldChange("baseCommand", event.target.value)
                }
                disabled={!repoName}
              />
              <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                arguments
              </label>
              <Input
                className="border-border bg-card h-9 text-xs"
                placeholder="build --filter=desktop"
                value={args}
                onChange={(event) =>
                  handleFieldChange("args", event.target.value)
                }
                disabled={!repoName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-muted-foreground text-[0.65rem] tracking-[0.2em] uppercase">
                notes and variables
              </label>
              <Textarea
                className="border-border bg-card min-h-[124px] text-xs"
                placeholder="ENV=production\nCACHE=false\n"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                disabled={!repoName}
              />
              <div className="border-border/70 bg-accent/60 text-muted-foreground rounded-none border p-3 text-[0.65rem]">
                Tip: use {"{{repo}}"} and {"{{branch}}"} to inject context in
                real-time.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
