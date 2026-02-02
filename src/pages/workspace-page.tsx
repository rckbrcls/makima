import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  MessageSquarePlus,
  Plus,
  Terminal,
} from "lucide-react";
import type {
  Action,
  AgentEvent,
  AgentQuestion,
  Session,
} from "@/components/agents/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const handleAgentChange = (agentId: string) => {
    if (!selectedRepo) return;

    // Find latest session for this agent in this repo
    const agentSession = sessions
      .filter((s) => s.agentId === agentId && s.repoName === selectedRepo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (agentSession) {
      handleSelectSession(agentSession);
    } else {
      toast.error("No session found for this agent");
    }
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
        <ResizablePanel
          defaultSize={"260px"}
          minSize={"250px"}
          collapsible
        >
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
        <ResizablePanel minSize={"400px"} >
          <div className="flex h-full flex-col overflow-hidden p-6">
            {(isCreatingNewSession && selectedRepo) || selectedSession ? (
              <SessionPanel
                session={selectedSession ?? null}
                actions={sessionActions}
                events={sessionEvents}
                questions={sessionQuestions}
                agentName={selectedAgent?.name}
                onEndSession={handleEndSession}
                onSendMessage={handleSendMessage}
                onAnswerQuestion={handleAnswerQuestion}
                mode={mode}
                onToggleMode={toggleMode}
                pendingCount={
                  selectedSession ? getPendingCount(selectedSession.id) : 0
                }
                onOpenApprovals={openApprovalDrawer}
                agents={agents}
                onAgentChange={handleAgentChange}
                onCreateSession={handleCreateSession}
                isCreating={isCreatingNewSession}
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
        <ResizablePanel
          defaultSize={"400px"}
          minSize={"200px"}
          collapsible
        >
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
