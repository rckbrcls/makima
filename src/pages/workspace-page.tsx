import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Cpu,
  Loader2,
  MessageSquarePlus,
  Plus,
  Send,
  Sparkles,
  Terminal,
} from "lucide-react";
import type {
  Action,
  Agent,
  AgentEvent,
  AgentQuestion,
  Session,
} from "@/components/agents/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAgentState } from "@/hooks/use-agent-state";
import { useUIStore } from "@/stores/ui-store";
import { useMakimaState } from "@/hooks/use-makima-state";
import { SessionPanel } from "@/components/agents/session-panel";
import { UnifiedSidebar } from "@/components/workspace/unified-sidebar";
import { LiveExecutionCard } from "@/components/repos/live-execution-card";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { runningCount } from "@/lib/command-hub/helpers";
import { mockAgentQuestions } from "@/mocks";
import { cn } from "@/lib/utils";

// ============================================================================
// New Session Chat Component
// ============================================================================

interface NewSessionChatProps {
  repoName: string;
  agents: Array<Agent>;
  onCreateSession: (agentId: string, goal: string) => Promise<void>;
  onCancel: () => void;
}

function NewSessionChat({
  repoName,
  agents,
  onCreateSession,
  onCancel,
}: NewSessionChatProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents[0]?.id ?? "",
  );
  const [message, setMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleSubmit = async () => {
    if (!message.trim() || !selectedAgentId) return;
    setIsCreating(true);
    await onCreateSession(selectedAgentId, message.trim());
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="border-border flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border bg-card flex flex-none items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-muted flex size-8 items-center justify-center rounded-full">
            <MessageSquarePlus className="text-primary size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">New Session</p>
            <p className="text-muted-foreground text-xs">{repoName}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>

      {/* Agent Selection */}
      <div className="border-border bg-muted flex-none border-b p-4">
        <label className="text-muted-foreground mb-2 block text-xs font-medium">
          Select an agent to work with
        </label>
        <div className="flex flex-wrap gap-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
                selectedAgentId === agent.id
                  ? "border-primary bg-accent text-primary"
                  : "border-border bg-background hover:border-primary",
              )}
            >
              <Cpu className="size-4" />
              <span className="text-sm font-medium">{agent.name}</span>
              {agent.model && (
                <span className="text-muted-foreground text-xs">
                  {agent.model.split("-")[0]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 text-center">
        <div className="max-w-md">
          <div className="bg-muted mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
            <Sparkles className="text-primary size-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            Start a conversation with {selectedAgent?.name ?? "an agent"}
          </h3>
          <p className="text-muted-foreground text-sm">
            Describe what you want to accomplish. This will be the goal of your
            session.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge
              variant="outline"
              className="hover:bg-muted cursor-pointer text-xs"
              onClick={() => setMessage("Fix a bug in ")}
            >
              Fix a bug
            </Badge>
            <Badge
              variant="outline"
              className="hover:bg-muted cursor-pointer text-xs"
              onClick={() => setMessage("Add a feature to ")}
            >
              Add a feature
            </Badge>
            <Badge
              variant="outline"
              className="hover:bg-muted cursor-pointer text-xs"
              onClick={() => setMessage("Refactor ")}
            >
              Refactor code
            </Badge>
            <Badge
              variant="outline"
              className="hover:bg-muted cursor-pointer text-xs"
              onClick={() => setMessage("Write tests for ")}
            >
              Write tests
            </Badge>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-border bg-card flex-none border-t p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to work on?"
            className="max-h-[120px] min-h-[60px] resize-none text-sm"
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
        <p className="text-muted-foreground mt-2 text-center text-[10px]">
          Press Enter to start session
        </p>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export function WorkspacePage() {
  const {
    agents,
    sessions,
    pendingApprovals,
    startSession,
    endSession,
    getActionsForSession,
    getEventsForSession,
    mode,
    toggleMode,
  } = useAgentState();

  const {
    selectedSession,
    selectSession,
    selectedRepo,
    selectRepo,
    openApprovalDrawer,
    openTerminalDrawer,
  } = useUIStore();

  const { state: makimaState, deleteRepository } = useMakimaState();

  const { commands, liveExecutions, repositories } = makimaState;

  // Local state
  const [sessionActions, setSessionActions] = useState<Array<Action>>([]);
  const [sessionEvents, setSessionEvents] = useState<Array<AgentEvent>>([]);
  const [sessionQuestions, setSessionQuestions] = useState<
    Array<AgentQuestion>
  >([]);
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);

  // Running counts for repos
  const runningCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    repositories.forEach((repo) => {
      counts[repo.name] = runningCount(repo.name, commands);
    });
    return counts;
  }, [repositories, commands]);

  // Pending count by session
  const getPendingCount = (sessionId: string) => {
    return pendingApprovals.filter((a) => a.action?.sessionId === sessionId)
      .length;
  };

  // Load session details when selected
  useEffect(() => {
    if (selectedSession) {
      setIsCreatingNewSession(false);
      const loadSessionDetails = async () => {
        const [actions, events] = await Promise.all([
          getActionsForSession(selectedSession.id),
          getEventsForSession(selectedSession.id),
        ]);
        setSessionActions(actions);
        setSessionEvents(events);
        const questions = mockAgentQuestions.filter(
          (q) => q.sessionId === selectedSession.id,
        );
        setSessionQuestions(questions);
      };
      void loadSessionDetails();
    }
  }, [selectedSession, getActionsForSession, getEventsForSession]);

  // Get agent for selected session
  const selectedAgent = selectedSession
    ? agents.find((a) => a.id === selectedSession.agentId)
    : null;

  // Handle user sending a message in chat
  const handleSendMessage = (message: string) => {
    if (!selectedSession) return;
    const userEvent: AgentEvent = {
      id: `event-user-${Date.now()}`,
      sessionId: selectedSession.id,
      agentId: selectedSession.agentId,
      level: "info",
      message,
      source: "user",
      createdAt: new Date().toISOString(),
    };
    setSessionEvents((prev) => [...prev, userEvent]);
  };

  // Handle answering a question
  const handleAnswerQuestion = (
    questionId: string,
    answer: string | Array<string>,
  ) => {
    setSessionQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answered: true, answer } : q,
      ),
    );
  };

  // Create new session
  const handleCreateSession = async (agentId: string, goal: string) => {
    if (!selectedRepo) return;
    const session = await startSession({
      agentId,
      repoName: selectedRepo,
      goal,
    });
    if (session) {
      setIsCreatingNewSession(false);
      selectSession(session);
    }
  };

  // Start new session flow
  const handleNewSession = (repoName: string) => {
    selectRepo(repoName);
    selectSession(null);
    setIsCreatingNewSession(true);
  };

  // Select existing session
  const handleSelectSession = (session: Session | null) => {
    if (session) {
      setIsCreatingNewSession(false);
      selectSession(session);
    } else {
      selectSession(null);
    }
  };

  const handleEndSession = async (success: boolean) => {
    if (selectedSession) {
      await endSession(selectedSession.id, success);
      selectSession(null);
    }
  };

  const handleDeleteRepository = async (repo: string) => {
    const removed = await deleteRepository(repo);
    if (removed && selectedRepo === repo) {
      selectRepo(null);
      selectSession(null);
      setIsCreatingNewSession(false);
    }
  };

  const handleSelectRepo = (repo: string | null) => {
    selectRepo(repo);
  };

  return (
    <div className="bg-background text-foreground relative flex h-full flex-col overflow-hidden">
      {/* Header */}

      <TextureOverlay texture="noise" className="mix-blend-overlay" />

      {/* Body: resizable 3-column layout */}
      <ResizablePanelGroup
        direction="horizontal"
        className="relative z-10 min-h-0 w-full flex-1"
      >
        {/* 1. Unified Sidebar (Repos + Sessions) */}
        <ResizablePanel defaultSize={16} minSize={200} collapsible={true}>
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
        </ResizablePanel>

        <ResizableHandle />

        {/* 2. Chat / Session View */}
        <ResizablePanel defaultSize={56} minSize={30} className="min-w-[320px]">
          <div className="flex h-full flex-col overflow-hidden p-4">
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
                mode={mode}
                onToggleMode={toggleMode}
                pendingCount={getPendingCount(selectedSession.id)}
                onOpenApprovals={openApprovalDrawer}
              />
            ) : (
              <Card className="bg-card flex h-full flex-col items-center justify-center border-dashed p-6 text-center">
                <MessageSquarePlus className="text-muted mb-4 size-12" />
                <h3 className="text-muted-foreground text-lg font-medium">
                  {selectedRepo ? "Start a new session" : "Select a repository"}
                </h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  {selectedRepo
                    ? 'Click "New Session" in the sidebar to start working with an AI agent'
                    : "Expand a repository in the sidebar to see its sessions"}
                </p>
                {selectedRepo && (
                  <Button
                    onClick={() => handleNewSession(selectedRepo)}
                    className="mt-4 gap-2"
                  >
                    <Plus className="size-4" />
                    New Session
                  </Button>
                )}
              </Card>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* 3. Live Executions Panel */}
        <ResizablePanel defaultSize={20} minSize={360} collapsible={true}>
          <div className="border-border bg-card h-full overflow-y-auto border-l p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Live Executions
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 rounded"
                onClick={openTerminalDrawer}
              >
                <Terminal className="size-3.5" />
              </Button>
            </div>
            {liveExecutions.length > 0 ? (
              <div className="space-y-3">
                {liveExecutions.map((execution, i) => (
                  <LiveExecutionCard key={i} execution={execution} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="text-muted mb-3 size-10" />
                <p className="text-muted-foreground text-sm">
                  No active executions
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Running processes will appear here
                </p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
