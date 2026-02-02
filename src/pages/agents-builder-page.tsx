import { useState } from "react";
import {
  Cpu,
  Eye,
  FileCode,
  GitBranch,
  Monitor,
  Pencil,
  Plus,
  Rocket,
  Search,
  Settings2,
  Terminal,
  TestTube,
  Trash2,
} from "lucide-react";
import type {
  Agent,
  AgentProvider,
  AgentSkill,
} from "@/components/agents/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentState } from "@/hooks/use-agent-state";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import { cn } from "@/lib/utils";

// ============================================================================
// Skill Configuration
// ============================================================================

const skillConfig: Record<
  AgentSkill,
  { label: string; icon: typeof FileCode; description: string }
> = {
  file_read: {
    label: "File Read",
    icon: Eye,
    description: "Read files from repositories",
  },
  file_write: {
    label: "File Write",
    icon: FileCode,
    description: "Create new files",
  },
  file_edit: {
    label: "File Edit",
    icon: Pencil,
    description: "Modify existing files",
  },
  bash: {
    label: "Bash",
    icon: Terminal,
    description: "Execute shell commands",
  },
  git: {
    label: "Git",
    icon: GitBranch,
    description: "Git operations (commit, push, etc)",
  },
  web_search: {
    label: "Web Search",
    icon: Search,
    description: "Search the internet",
  },
  browser: {
    label: "Browser",
    icon: Monitor,
    description: "Navigate and interact with web pages",
  },
  code_analysis: {
    label: "Code Analysis",
    icon: FileCode,
    description: "Analyze and understand code",
  },
  testing: {
    label: "Testing",
    icon: TestTube,
    description: "Run and write tests",
  },
  deployment: {
    label: "Deployment",
    icon: Rocket,
    description: "Deploy applications",
  },
};

const allSkills = Object.keys(skillConfig) as Array<AgentSkill>;

const providerOptions: Array<{
  value: AgentProvider;
  label: string;
  disabled: boolean;
}> = [
  { value: "cli", label: "CLI Agent (Claude Code)", disabled: false },
  { value: "api", label: "API Provider", disabled: true },
  { value: "local", label: "Local Model (Ollama)", disabled: true },
];

const modelOptions = [
  {
    value: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    provider: "cli",
  },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", provider: "cli" },
  { value: "claude-3-opus", label: "Claude 3 Opus", provider: "cli" },
  { value: "gpt-4o", label: "GPT-4o", provider: "api" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "api" },
];

// ============================================================================
// Components
// ============================================================================

interface SkillToggleProps {
  skill: AgentSkill;
  selected: boolean;
  onToggle: () => void;
}

function SkillToggle({ skill, selected, onToggle }: SkillToggleProps) {
  const config = skillConfig[skill];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-all",
        selected
          ? "bg-accent border-primary text-primary"
          : "bg-muted border-border text-muted-foreground hover:bg-accent",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{config.label}</p>
      </div>
    </button>
  );
}

interface AgentCardBuilderProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function AgentCardBuilder({
  agent,
  isSelected,
  onSelect,
  onDelete,
}: AgentCardBuilderProps) {
  return (
    <Card
      className={cn(
        "hover:border-primary cursor-pointer transition-all",
        isSelected && "border-primary bg-accent",
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "bg-muted flex size-10 items-center justify-center rounded-lg",
                agent.status === "running" && "text-green-500",
                agent.status === "error" && "text-red-500",
                agent.status !== "running" &&
                  agent.status !== "error" &&
                  "text-muted-foreground",
              )}
            >
              <Cpu className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium">{agent.name}</h3>
              <p className="text-muted-foreground text-xs">
                {agent.model ?? "No model"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-8"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {agent.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-[10px]">
              {skillConfig[skill]?.label ?? skill}
            </Badge>
          ))}
          {agent.skills.length > 4 && (
            <Badge variant="outline" className="text-[10px]">
              +{agent.skills.length - 4}
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              agent.status === "running" && "border-green-500 text-green-500",
              agent.status === "error" && "border-red-500 text-red-500",
              agent.status === "active" && "border-blue-500 text-blue-500",
            )}
          >
            {agent.status}
          </Badge>
          <span className="text-muted-foreground text-[10px]">
            {agent.provider}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export function AgentsBuilderPage() {
  const { agents, createAgent, deleteAgent } = useAgentState();

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<AgentProvider>("cli");
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [selectedSkills, setSelectedSkills] = useState<Array<AgentSkill>>([
    "file_read",
    "file_write",
    "file_edit",
    "bash",
    "git",
  ]);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsCreating(false);
    // Populate form with agent data
    setName(agent.name);
    setProvider(agent.provider);
    setModel(agent.model ?? "claude-sonnet-4-20250514");
    setSelectedSkills(agent.skills);
  };

  const handleNewAgent = () => {
    setSelectedAgent(null);
    setIsCreating(true);
    // Reset form
    setName("");
    setProvider("cli");
    setModel("claude-sonnet-4-20250514");
    setSelectedSkills(["file_read", "file_write", "file_edit", "bash", "git"]);
  };

  const handleToggleSkill = (skill: AgentSkill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleSaveAgent = async () => {
    if (!name.trim()) return;

    await createAgent({
      name: name.trim(),
      provider,
      model,
      skills: selectedSkills,
      repos: [],
    });

    // Reset
    setIsCreating(false);
    setSelectedAgent(null);
    setName("");
  };

  const handleDeleteAgent = async (agentId: string) => {
    await deleteAgent(agentId);
    if (selectedAgent?.id === agentId) {
      setSelectedAgent(null);
    }
  };

  return (
    <div className="bg-background text-foreground relative flex h-full flex-col overflow-hidden">
      <TextureOverlay texture="noise" className="z-0 opacity-[0.03]" />

      {/* Header */}
      <header className="border-border bg-card relative z-10 flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
            <Cpu className="text-primary size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Agents Builder</h1>
            <p className="text-muted-foreground text-xs">
              Configure AI agents with skills and capabilities
            </p>
          </div>
        </div>
        <Button onClick={handleNewAgent} className="gap-2">
          <Plus className="size-4" />
          New Agent
        </Button>
      </header>

      {/* Main Content */}
      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-[320px_1fr] overflow-hidden">
        {/* Agents List */}
        <div className="border-border bg-card space-y-3 overflow-y-auto border-r p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-medium">
              Your Agents ({agents.length})
            </h2>
          </div>

          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Cpu className="text-muted mb-3 size-12" />
              <p className="text-muted-foreground text-sm">
                No agents configured
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Create your first agent to get started
              </p>
            </div>
          ) : (
            agents.map((agent) => (
              <AgentCardBuilder
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent?.id === agent.id}
                onSelect={() => handleSelectAgent(agent)}
                onDelete={() => handleDeleteAgent(agent.id)}
              />
            ))
          )}
        </div>

        {/* Agent Editor */}
        <div className="bg-background overflow-y-auto p-6">
          {!selectedAgent && !isCreating ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Settings2 className="text-muted mb-4 size-16" />
              <h3 className="text-muted-foreground text-lg font-medium">
                Select an agent to configure
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Choose an agent from the list or create a new one to configure
                its skills, model, and capabilities.
              </p>
              <Button
                onClick={handleNewAgent}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="size-4" />
                Create New Agent
              </Button>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="size-4" />
                    {isCreating ? "New Agent" : `Edit: ${selectedAgent?.name}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Luna, CodeBot, DevAssistant"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Provider */}
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select
                      value={provider}
                      onValueChange={(v) => setProvider(v as AgentProvider)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {providerOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.disabled}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model */}
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Skills & Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {allSkills.map((skill) => (
                      <SkillToggle
                        key={skill}
                        skill={skill}
                        selected={selectedSkills.includes(skill)}
                        onToggle={() => handleToggleSkill(skill)}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs">
                    Selected: {selectedSkills.length} skill(s)
                  </p>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAgent(null);
                    setIsCreating(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveAgent} disabled={!name.trim()}>
                  {isCreating ? "Create Agent" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
