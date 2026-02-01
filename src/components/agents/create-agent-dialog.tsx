import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
  useExpandableScreen,
} from "@/components/ui/expandable-screen"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bot, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Agent, AgentProvider, CreateAgentRequest } from "./types"

// ============================================================================
// Model Options
// ============================================================================

const modelOptions = [
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", provider: "cli" },
  { value: "claude-3-opus", label: "Claude 3 Opus", provider: "cli" },
  { value: "gpt-4o", label: "GPT-4o", provider: "cli" },
  { value: "gemini-pro", label: "Gemini Pro", provider: "cli" },
  { value: "custom", label: "Custom Model", provider: "cli" },
]

const providerOptions: { value: AgentProvider; label: string }[] = [
  { value: "cli", label: "CLI Agent" },
  { value: "local", label: "Local Model (Coming Soon)" },
  { value: "api", label: "API Provider (Coming Soon)" },
]

// ============================================================================
// Component
// ============================================================================

interface CreateAgentDialogProps {
  children?: ReactNode
  onCreateAgent: (request: CreateAgentRequest) => Promise<Agent | null>
}

export function CreateAgentDialog({
  children,
  onCreateAgent,
}: CreateAgentDialogProps) {
  const [name, setName] = useState("")
  const [provider, setProvider] = useState<AgentProvider>("cli")
  const [model, setModel] = useState("claude-3-5-sonnet")
  const [repos, setRepos] = useState<string[]>([])
  const [repoInput, setRepoInput] = useState("")

  return (
    <ExpandableScreen>
      <ExpandableScreenTrigger>{children}</ExpandableScreenTrigger>
      <ExpandableScreenContent className="bg-background border border-border pt-6">
        <CreateAgentForm
          name={name}
          setName={setName}
          provider={provider}
          setProvider={setProvider}
          model={model}
          setModel={setModel}
          repos={repos}
          setRepos={setRepos}
          repoInput={repoInput}
          setRepoInput={setRepoInput}
          onCreateAgent={onCreateAgent}
        />
      </ExpandableScreenContent>
    </ExpandableScreen>
  )
}

interface CreateAgentFormProps {
  name: string
  setName: (v: string) => void
  provider: AgentProvider
  setProvider: (v: AgentProvider) => void
  model: string
  setModel: (v: string) => void
  repos: string[]
  setRepos: (v: string[]) => void
  repoInput: string
  setRepoInput: (v: string) => void
  onCreateAgent: (request: CreateAgentRequest) => Promise<Agent | null>
}

function CreateAgentForm({
  name,
  setName,
  provider,
  setProvider,
  model,
  setModel,
  repos,
  setRepos,
  repoInput,
  setRepoInput,
  onCreateAgent,
}: CreateAgentFormProps) {
  const { collapse } = useExpandableScreen()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    setIsLoading(true)

    const request: CreateAgentRequest = {
      name: name.trim(),
      provider,
      model: model !== "custom" ? model : undefined,
      repos,
    }

    const agent = await onCreateAgent(request)

    setIsLoading(false)

    if (agent) {
      // Reset form
      setName("")
      setProvider("cli")
      setModel("claude-3-5-sonnet")
      setRepos([])
      setRepoInput("")
      collapse()
    }
  }

  const handleAddRepo = () => {
    const trimmed = repoInput.trim()
    if (trimmed && !repos.includes(trimmed)) {
      setRepos([...repos, trimmed])
      setRepoInput("")
    }
  }

  const handleRemoveRepo = (repo: string) => {
    setRepos(repos.filter((r) => r !== repo))
  }

  const handleRepoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddRepo()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col space-y-1.5 p-6 pb-2 text-center sm:text-left">
        <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
          <Bot className="size-5" />
          Create Agent
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure a new AI agent to run tasks in your projects.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-2">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="My Agent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as AgentProvider)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.value !== "cli"}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select
            value={model}
            onValueChange={setModel}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
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

        {/* Repositories */}
        <div className="space-y-2">
          <Label htmlFor="repos">Repositories (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="repos"
              placeholder="/path/to/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={handleRepoKeyDown}
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRepo}
              disabled={isLoading || !repoInput.trim()}
            >
              Add
            </Button>
          </div>
          {repos.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {repos.map((repo) => (
                <Badge
                  key={repo}
                  variant="secondary"
                  className="text-[0.6rem] pr-1"
                >
                  {repo.split("/").pop() ?? repo}
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={() => handleRemoveRepo(repo)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-[0.65rem] text-muted-foreground">
            Add repository paths the agent can work with
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => collapse()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Agent"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
