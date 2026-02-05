import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { GitBranch, Terminal } from "lucide-react";

import { AddRepositoryDialog } from "./add-repository-dialog";
import { GitChangesCard } from "./git-changes-card";
import { RepositorySidebar } from "./repository-sidebar";
import { TerminalCard } from "./terminal-card";
import type { PanelImperativeHandle } from "react-resizable-panels";
import type {
  ChatItem,
  Conversation,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types";
import type { ChatMessage, Provider } from "@/lib/provider-types";
import type { Repository } from "@/lib/code-types";
import { ConversationComposer } from "@/components/main/conversation-composer";
import { ConversationThread } from "@/components/main/conversation-thread";
import { buildMessageId } from "@/components/main/jarvis-data";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useChatProvider } from "@/hooks/use-chat-provider";
import { useConversations } from "@/hooks/use-conversations";
import { useRepositories } from "@/hooks/use-repositories";
import { useSettingsStore } from "@/stores/settings-store";
import { ModelSelector } from "@/components/main/model-selector";

interface StreamingState {
  messageId: string;
  accumulatedContent: string;
  sessionId: string;
}

interface CodeTabContextValue {
  // Repository state
  repositories: Array<Repository>;
  activeRepositoryId: string | null;
  activeRepository: Repository | undefined;
  // Conversation state
  repoConversations: Array<Conversation>;
  activeConversationId: string | null;
  activeConversation: Conversation | undefined;
  // Actions
  setActiveRepositoryId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  handleSelectRepository: (repoId: string) => Promise<void>;
  handleSelectConversation: (convId: string) => Promise<void>;
  handleAddRepository: (
    name: string,
    path: string,
    branch?: string,
  ) => Promise<void>;
  handleDeleteRepository: (repoId: string) => Promise<void>;
  handleNewConversation: (repoId?: string) => Promise<void>;
  // Dialog state
  isAddRepoDialogOpen: boolean;
  setIsAddRepoDialogOpen: (open: boolean) => void;
}

const CodeTabContext = createContext<CodeTabContextValue | null>(null);

function useCodeTabContext() {
  const ctx = useContext(CodeTabContext);
  if (!ctx)
    throw new Error("useCodeTabContext must be used within CodeTabProvider");
  return ctx;
}

interface CodeTabProviderProps {
  children: React.ReactNode;
}

export function CodeTabProvider({ children }: CodeTabProviderProps) {
  const { repositories, createRepository, deleteRepository } =
    useRepositories();

  const { conversations, loadConversation, createConversation } =
    useConversations();

  // UI State
  const [isAddRepoDialogOpen, setIsAddRepoDialogOpen] = useState(false);
  const [activeRepositoryId, setActiveRepositoryId] = useState<string | null>(
    null,
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Get active repository
  const activeRepository = useMemo(
    () => repositories.find((r) => r.id === activeRepositoryId),
    [repositories, activeRepositoryId],
  );

  // Filter conversations for this repository
  const repoConversations = useMemo(
    () => conversations.filter((c) => c.repositoryId === activeRepositoryId),
    [conversations, activeRepositoryId],
  );

  // Get active conversation
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  // Handlers
  const handleSelectRepository = useCallback(
    async (repoId: string) => {
      setActiveRepositoryId(repoId);
      // Auto-select first conversation for this repo
      const repoConvs = conversations.filter((c) => c.repositoryId === repoId);
      if (repoConvs.length > 0) {
        setActiveConversationId(repoConvs[0].id);
        if (repoConvs[0].items.length === 0) {
          await loadConversation(repoConvs[0].id);
        }
      } else {
        setActiveConversationId(null);
      }
    },
    [conversations, loadConversation],
  );

  const handleSelectConversation = useCallback(
    async (convId: string) => {
      setActiveConversationId(convId);
      const conv = conversations.find((c) => c.id === convId);
      if (conv && conv.items.length === 0) {
        await loadConversation(convId);
      }
    },
    [conversations, loadConversation],
  );

  const handleAddRepository = useCallback(
    async (name: string, path: string, branch?: string) => {
      const repo = await createRepository(name, path, branch);
      if (repo) {
        setActiveRepositoryId(repo.id);
      }
    },
    [createRepository],
  );

  const handleDeleteRepository = useCallback(
    async (repoId: string) => {
      await deleteRepository(repoId);
      if (activeRepositoryId === repoId) {
        setActiveRepositoryId(null);
        setActiveConversationId(null);
      }
    },
    [deleteRepository, activeRepositoryId],
  );

  const handleNewConversation = useCallback(
    async (repoId?: string) => {
      const targetRepoId = repoId ?? activeRepositoryId;
      if (!targetRepoId) return;

      // Check for existing empty conversation
      const existingEmpty = conversations.find(
        (c) => c.repositoryId === targetRepoId && c.items.length === 0,
      );
      if (existingEmpty) {
        setActiveConversationId(existingEmpty.id);
        return;
      }

      // Create new conversation linked to repository
      const newConv = await createConversation(
        "New conversation",
        targetRepoId,
      );
      if (newConv) {
        setActiveConversationId(newConv.id);
      }
    },
    [activeRepositoryId, conversations, createConversation],
  );

  const value: CodeTabContextValue = {
    repositories,
    activeRepositoryId,
    activeRepository,
    repoConversations,
    activeConversationId,
    activeConversation,
    setActiveRepositoryId,
    setActiveConversationId,
    handleSelectRepository,
    handleSelectConversation,
    handleAddRepository,
    handleDeleteRepository,
    handleNewConversation,
    isAddRepoDialogOpen,
    setIsAddRepoDialogOpen,
  };

  return (
    <CodeTabContext.Provider value={value}>
      {children}
      <AddRepositoryDialog
        open={isAddRepoDialogOpen}
        onOpenChange={setIsAddRepoDialogOpen}
        onAdd={handleAddRepository}
      />
    </CodeTabContext.Provider>
  );
}

// Sidebar component
export function CodeTabSidebar() {
  const ctx = useCodeTabContext();

  return (
    <RepositorySidebar
      repositories={ctx.repositories}
      conversations={ctx.repoConversations}
      activeRepositoryId={ctx.activeRepositoryId}
      activeConversationId={ctx.activeConversationId}
      onSelectRepository={ctx.handleSelectRepository}
      onSelectConversation={ctx.handleSelectConversation}
      onAddRepository={() => ctx.setIsAddRepoDialogOpen(true)}
      onDeleteRepository={ctx.handleDeleteRepository}
      onNewConversation={ctx.handleNewConversation}
    />
  );
}

// Workspace component (main content area)
export function CodeTabWorkspace() {
  const ctx = useCodeTabContext();

  const {
    startChatStream,
    auth,
    ollama: {
      connectionState,
      models: ollamaModels,
      isLoadingModels,
      pullingModel,
      pullProgress,
      pullModel,
      deleteModel,
      fetchModels,
    },
  } = useChatProvider();

  const { providers } = useSettingsStore();
  const { addMessage, setConversations } = useConversations();

  // Panel refs for collapsible panels
  const terminalPanelRef = useRef<PanelImperativeHandle>(null);
  const gitChangesPanelRef = useRef<PanelImperativeHandle>(null);

  // Collapsed state tracking (for button styling)
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(true);
  const [isGitChangesCollapsed, setIsGitChangesCollapsed] = useState(true);

  // Chat state
  const [composerValue, setComposerValue] = useState("");
  const [composerRows, setComposerRows] = useState(1);
  const [tone] = useState("balanced");
  const [provider, setProvider] = useState<Provider>("ollama");
  const [model, setModel] = useState("");

  // Streaming state
  const streamingStatesRef = useRef<Map<string, StreamingState>>(new Map());

  // Auto-select first model
  useEffect(() => {
    if (provider === "ollama" && ollamaModels.length > 0 && !model) {
      setModel(ollamaModels[0].name);
    }
  }, [ollamaModels, model, provider]);

  const handleSelectModel = useCallback(
    (newModel: string, newProvider: Provider) => {
      setModel(newModel);
      setProvider(newProvider);
    },
    [],
  );

  // Toggle handlers for collapsible panels
  const toggleTerminal = useCallback(() => {
    const panel = terminalPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
        setIsTerminalCollapsed(false);
      } else {
        panel.collapse();
        setIsTerminalCollapsed(true);
      }
    }
  }, []);

  const toggleGitChanges = useCallback(() => {
    const panel = gitChangesPanelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
        setIsGitChangesCollapsed(false);
      } else {
        panel.collapse();
        setIsGitChangesCollapsed(true);
      }
    }
  }, []);

  // Update composer rows
  useEffect(() => {
    const lines = composerValue.split("\n").length;
    setComposerRows(Math.min(6, Math.max(1, lines)));
  }, [composerValue]);

  const activeConversation = ctx.activeConversation;

  const hasRunningExecution = Boolean(
    activeConversation?.items.some(
      (item) => item.kind === "execution" && item.run.status === "running",
    ),
  );

  const isThinking = Boolean(
    activeConversation?.items.some(
      (item) => item.kind === "message" && item.message.state === "thinking",
    ),
  );

  const isStreaming = Boolean(
    activeConversation?.items.some(
      (item) => item.kind === "message" && item.message.state === "streaming",
    ),
  );

  const inputState = hasRunningExecution
    ? "executing"
    : isThinking || isStreaming
      ? "thinking"
      : "idle";

  const handleSendMessage = useCallback(async () => {
    if (!activeConversation || !composerValue.trim()) return;
    if (
      hasRunningExecution ||
      streamingStatesRef.current.has(activeConversation.id)
    )
      return;
    if (!model) return;

    // Check provider availability
    if (provider === "ollama" && !connectionState.isConnected) return;
    if (provider === "openai" && !auth.status?.openai.is_configured) return;
    if (provider === "anthropic" && !auth.status?.anthropic.is_configured)
      return;

    const now = Date.now();
    const messageId = buildMessageId();
    const assistantId = buildMessageId();
    const sessionId = `session-${now}`;
    const userContent = composerValue.trim();
    const conversationId = activeConversation.id;

    // Register streaming state
    streamingStatesRef.current.set(conversationId, {
      messageId: assistantId,
      accumulatedContent: "",
      sessionId,
    });

    const userMessage: ChatItem = {
      id: messageId,
      kind: "message",
      message: {
        id: messageId,
        role: "user",
        state: "normal",
        content: userContent,
        createdAt: now,
        meta: { provider, model, tone },
      },
    };

    const assistantMessage: ChatItem = {
      id: assistantId,
      kind: "message",
      message: {
        id: assistantId,
        role: "assistant",
        state: "thinking",
        content: "",
        createdAt: now + 1,
        meta: { provider, model, tone },
        streamedChars: 0,
      },
    };

    const nextTitle =
      activeConversation.title === "New conversation" ||
      activeConversation.items.length === 0
        ? userContent.slice(0, 32)
        : activeConversation.title;

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;
        return {
          ...conversation,
          title: nextTitle,
          summary: userContent.slice(0, 60) || conversation.summary,
          status: "running" as ConversationStatus,
          updatedAt: now,
          items: [...conversation.items, userMessage, assistantMessage],
        };
      }),
    );

    setComposerValue("");

    await addMessage(conversationId, {
      id: messageId,
      role: "user",
      state: "normal",
      content: userContent,
      createdAt: now,
      provider,
      model,
      tone,
    });

    const conversationHistory: Array<ChatMessage> = activeConversation.items
      .filter((item) => item.kind === "message")
      .map((item) => ({
        role: item.message.role as "user" | "assistant" | "system",
        content: item.message.content,
      }));

    conversationHistory.push({ role: "user", content: userContent });

    startChatStream({
      sessionId,
      provider,
      model,
      messages: conversationHistory,
      temperature: 0.7,
      maxTokens: 4096,
      onChunk: (content, done) => {
        const state = streamingStatesRef.current.get(conversationId);
        if (!state) return;

        state.accumulatedContent += content;
        const currentContent = state.accumulatedContent;
        const currentMessageId = state.messageId;

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item;
              return {
                ...item,
                message: {
                  ...item.message,
                  content: currentContent,
                  state: (done ? "normal" : "streaming") as MessageState,
                  streamedChars: currentContent.length,
                },
              };
            });

            return {
              ...conversation,
              status: (done ? "idle" : "running") as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            };
          }),
        );

        if (done) {
          addMessage(conversationId, {
            id: currentMessageId,
            role: "assistant",
            state: "normal",
            content: currentContent,
            createdAt: Date.now(),
            provider,
            model,
            tone,
          });

          streamingStatesRef.current.delete(conversationId);
        }
      },
      onError: (error) => {
        const state = streamingStatesRef.current.get(conversationId);
        if (!state) return;

        const currentMessageId = state.messageId;
        const errorContent = error || "An error occurred";

        setConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item;
              return {
                ...item,
                message: {
                  ...item.message,
                  content: errorContent,
                  state: "error" as MessageState,
                },
              };
            });

            return {
              ...conversation,
              status: "error" as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            };
          }),
        );

        addMessage(conversationId, {
          id: currentMessageId,
          role: "assistant",
          state: "error",
          content: errorContent,
          createdAt: Date.now(),
          provider,
          model,
          tone,
        });

        streamingStatesRef.current.delete(conversationId);
      },
    });
  }, [
    activeConversation,
    composerValue,
    hasRunningExecution,
    connectionState.isConnected,
    model,
    provider,
    auth.status,
    tone,
    startChatStream,
    addMessage,
    setConversations,
  ]);

  const repoPath = ctx.activeRepository?.path;

  // Show empty state if no repository selected
  if (!ctx.activeRepositoryId) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-zinc-500">
        <p className="text-sm">Select a repository to start coding</p>
        <p className="mt-1 text-xs text-zinc-600">
          Add a repository using the + button in the sidebar
        </p>
      </div>
    );
  }

  return (
    <section className="my-3 mr-3 flex h-full w-[calc(100vw-324px)] flex-col overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left side: Chat + Terminal */}
        <ResizablePanel defaultSize={100} minSize={30}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Chat area - takes full space when terminal collapsed */}
            <ResizablePanel defaultSize={100} minSize={30}>
              <div className="border-border bg-background relative flex h-full flex-col overflow-hidden rounded-3xl border">
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  {/* Toggle buttons at top-right */}
                  <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-expanded={!isTerminalCollapsed}
                      onClick={toggleTerminal}
                      title={
                        isTerminalCollapsed ? "Show Terminal" : "Hide Terminal"
                      }
                    >
                      <Terminal className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-expanded={!isGitChangesCollapsed}
                      onClick={toggleGitChanges}
                      title={
                        isGitChangesCollapsed
                          ? "Show Git Changes"
                          : "Hide Git Changes"
                      }
                    >
                      <GitBranch className="size-4" />
                    </Button>
                  </div>

                  <ConversationThread
                    activeConversation={activeConversation}
                    onViewRun={() => {}}
                  />
                  <ConversationComposer
                    composerValue={composerValue}
                    composerRows={composerRows}
                    hasRunningExecution={hasRunningExecution}
                    inputState={inputState}
                    onComposerChange={setComposerValue}
                    onSendMessage={handleSendMessage}
                    onNewConversation={() => ctx.handleNewConversation()}
                    isModelSelected={Boolean(model)}
                    modelSelector={
                      <ModelSelector
                        ollamaModels={ollamaModels}
                        selectedModel={model}
                        selectedProvider={provider}
                        onSelectModel={handleSelectModel}
                        isOllamaConnected={connectionState.isConnected}
                        isLoadingModels={isLoadingModels}
                        pullingModel={pullingModel}
                        pullProgress={pullProgress}
                        onPullModel={pullModel}
                        onDeleteModel={deleteModel}
                        onRefresh={fetchModels}
                        authStatus={auth.status}
                        openaiAuthPreference={
                          providers.openai.preferredAuthSource
                        }
                        anthropicAuthPreference={
                          providers.anthropic.preferredAuthSource
                        }
                      />
                    }
                  />
                </div>
              </div>
            </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Terminal - collapsible, starts collapsed */}
          <ResizablePanel
            panelRef={terminalPanelRef}
            defaultSize={0}
            minSize={0}
            collapsedSize={0}
            collapsible
          >
            <TerminalCard cwd={repoPath} className="h-full" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right side: Git Changes - collapsible, starts collapsed */}
      <ResizablePanel
        panelRef={gitChangesPanelRef}
        defaultSize={0}
        minSize={0}
        collapsedSize={0}
        collapsible
      >
        <GitChangesCard
          repoPath={repoPath}
          className="h-full border-l border-zinc-800"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
    </section>
  );
}

// Legacy export for backwards compatibility
export function CodeTab() {
  return <CodeTabSidebar />;
}
