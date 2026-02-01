import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Cpu,
  AlertCircle,
  Loader2,
  Send,
  MessageSquarePlus,
  Sparkles,
} from "lucide-react"
import { useAgentState } from "@/hooks/use-agent-state"
import { useUIStore } from "@/stores/ui-store"
import { useMakimaState } from "@/hooks/use-makima-state"
import { SessionPanel } from "@/components/agents/session-panel"
import { PageHeader } from "@/components/shared/page-header"
import { UnifiedSidebar } from "@/components/workspace/unified-sidebar"
import { LiveExecutionCard } from "@/components/repos/live-execution-card"
import { TextureOverlay } from "@/components/ui/texture-overlay"
import { runningCount } from "@/lib/command-hub/helpers"
import type { Session, Action, AgentEvent, Agent, AgentQuestion } from "@/components/agents/types"
import { mockAgentQuestions } from "@/mocks"
import { cn } from "@/lib/utils"

// ============================================================================
// New Session Chat Component
// ============================================================================

interface NewSessionChatProps {
  repoName: string
  agents: Agent[]
  onCreateSession: (agentId: string, goal: string) => Promise<void>
  onCancel: () => void
}

function NewSessionChat({ repoName, agents, onCreateSession, onCancel }: NewSessionChatProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id ?? "")
  const [message, setMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)

  const handleSubmit = async () => {
    if (!message.trim() || !selectedAgentId) return
    setIsCreating(true)
    await onCreateSession(selectedAgentId, message.trim())
    setIsCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden border-border">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquarePlus className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">New Session</p>
            <p className="text-xs text-muted-foreground">{repoName}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
      </div>

      {/* Agent Selection */}
      <div className="flex-none p-4 border-b border-border bg-muted/30">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Select an agent to work with
        </label>
        <div className="flex gap-2 flex-wrap">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                selectedAgentId === agent.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <Cpu className="size-4" />
              <span className="text-sm font-medium">{agent.name}</span>
              {agent.model && (
                <span className="text-xs text-muted-foreground">
                  {agent.model.split("-")[0]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-md">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="size-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Start a conversation with {selectedAgent?.name ?? "an agent"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Describe what you want to accomplish. This will be the goal of your session.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => setMessage("Fix a bug in ")}>Fix a bug</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => setMessage("Add a feature to ")}>Add a feature</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => setMessage("Refactor ")}>Refactor code</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => setMessage("Write tests for ")}>Write tests</Badge>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to work on?"
            className="min-h-[60px] max-h-[120px] resize-none text-sm"
            rows={2}
            autoFocus
          />
          <Button
            size="icon"
            className="size-[60px] shrink-0"
            disabled={!message.trim() || !selectedAgentId || isCreating}
            onClick={handleSubmit}
          >
            {isCreating ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Press Enter to start session
        </p>
      </div>
    </Card>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export function WorkspacePage() {
  const {
    mode,
    agents,
    sessions,
    pendingApprovals,
    refreshState,
    startSession,
    endSession,
    getActionsForSession,
    getEventsForSession,
    toggleMode,
  } = useAgentState()

  const {
    selectedSession,
    selectSession,
    selectedRepo,
    selectRepo,
    openApprovalDrawer,
    openTerminalDrawer,
  } = useUIStore()

  const {
    state: makimaState,
    deleteRepository,
  } = useMakimaState()

  const { commands, liveExecutions, repositories } = makimaState

  // Local state
  const [sessionActions, setSessionActions] = useState<Action[]>([])
  const [sessionEvents, setSessionEvents] = useState<AgentEvent[]>([])
  const [sessionQuestions, setSessionQuestions] = useState<AgentQuestion[]>([])
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false)

  // Running counts for repos
  const runningCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {}
    repositories.forEach((repo) => {
      counts[repo.name] = runningCount(repo.name, commands)
    })
    return counts
  }, [repositories, commands])

  // Pending count by session
  const getPendingCount = (sessionId: string) => {
    return pendingApprovals.filter((a) => a.action?.sessionId === sessionId).length
  }

  // Load session details when selected
  useEffect(() => {
    if (selectedSession) {
      setIsCreatingNewSession(false)
      const loadSessionDetails = async () => {
        const [actions, events] = await Promise.all([
          getActionsForSession(selectedSession.id),
          getEventsForSession(selectedSession.id),
        ])
        setSessionActions(actions)
        setSessionEvents(events)
        const questions = mockAgentQuestions.filter(
          (q) => q.sessionId === selectedSession.id
        )
        setSessionQuestions(questions)
      }
      void loadSessionDetails()
    }
  }, [selectedSession, getActionsForSession, getEventsForSession])

  // Get agent for selected session
  const selectedAgent = selectedSession
    ? agents.find((a) => a.id === selectedSession.agentId)
    : null

  // Handle user sending a message in chat
  const handleSendMessage = (message: string) => {
    if (!selectedSession) return
    const userEvent: AgentEvent = {
      id: `event-user-${Date.now()}`,
      sessionId: selectedSession.id,
      agentId: selectedSession.agentId,
      level: "info",
      message,
      source: "user",
      createdAt: new Date().toISOString(),
    }
    setSessionEvents((prev) => [...prev, userEvent])
  }

  // Handle answering a question
  const handleAnswerQuestion = (questionId: string, answer: string | string[]) => {
    setSessionQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answered: true, answer } : q
      )
    )
  }

  // Create new session
  const handleCreateSession = async (agentId: string, goal: string) => {
    if (!selectedRepo) return
    const session = await startSession({
      agentId,
      repoName: selectedRepo,
      goal,
    })
    if (session) {
      setIsCreatingNewSession(false)
      selectSession(session)
    }
  }

  // Start new session flow
  const handleNewSession = (repoName: string) => {
    selectRepo(repoName)
    selectSession(null)
    setIsCreatingNewSession(true)
  }

  // Select existing session
  const handleSelectSession = (session: Session | null) => {
    if (session) {
      setIsCreatingNewSession(false)
      selectSession(session)
    } else {
      selectSession(null)
    }
  }

  const handleEndSession = async (success: boolean) => {
    if (selectedSession) {
      await endSession(selectedSession.id, success)
      selectSession(null)
    }
  }

  const handleDeleteRepository = async (repo: string) => {
    const removed = await deleteRepository(repo)
    if (removed && selectedRepo === repo) {
      selectRepo(null)
      selectSession(null)
      setIsCreatingNewSession(false)
    }
  }

  const handleSelectRepo = (repo: string | null) => {
    selectRepo(repo)
  }

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">

      {/* Header */}
      <PageHeader
        mode={mode}
        pendingCount={pendingApprovals.length}
        onToggleMode={toggleMode}
        onOpenApprovals={openApprovalDrawer}
        onOpenTerminal={openTerminalDrawer}
        onRefresh={refreshState}
      />

      <TextureOverlay texture="noise" className="mix-blend-overlay" />


      {/* Body: 3-column layout */}
      <div className="grid relative w-full min-h-0 flex-1 lg:grid-cols-[300px_1fr_320px]">
        {/* 1. Unified Sidebar (Repos + Sessions) */}
        <UnifiedSidebar
          repositories={repositories}
          sessions={sessions}
          agents={agents}
          selectedRepo={selectedRepo}
          selectedSession={selectedSession}
          isCreatingNewSession={isCreatingNewSession}
          runningCounts={runningCounts}
          onSelectRepo={handleSelectRepo}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteRepository={handleDeleteRepository}
          getPendingCount={getPendingCount}
        />

        {/* 2. Chat / Session View */}
        <div className="p-4 flex flex-col h-full overflow-hidden">
          {isCreatingNewSession && selectedRepo ? (
            <NewSessionChat
              repoName={selectedRepo}
              agents={agents}
              onCreateSession={handleCreateSession}
              onCancel={() => setIsCreatingNewSession(false)}
            />
          ) : selectedSession ? (
            <SessionPanel
              session={selectedSession}
              actions={sessionActions}
              events={sessionEvents}
              questions={sessionQuestions}
              agentName={selectedAgent?.name}
              onEndSession={handleEndSession}
              onSendMessage={handleSendMessage}
              onAnswerQuestion={handleAnswerQuestion}
            />
          ) : (
            <Card className="flex flex-col items-center justify-center text-center p-6 h-full border-dashed">
              <MessageSquarePlus className="size-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {selectedRepo ? "Start a new session" : "Select a repository"}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                {selectedRepo
                  ? "Click \"New Session\" in the sidebar to start working with an AI agent"
                  : "Expand a repository in the sidebar to see its sessions"
                }
              </p>
              {selectedRepo && (
                <Button onClick={() => handleNewSession(selectedRepo)} className="mt-4 gap-2">
                  <Plus className="size-4" />
                  New Session
                </Button>
              )}
            </Card>
          )}
        </div>

        {/* 3. Live Executions Panel */}
        <div className="border-l border-border bg-card p-4 overflow-y-auto">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Live Executions
          </h3>
          {liveExecutions.length > 0 ? (
            <div className="space-y-3">
              {liveExecutions.map((execution, i) => (
                <LiveExecutionCard key={i} execution={execution} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No active executions</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Running processes will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
