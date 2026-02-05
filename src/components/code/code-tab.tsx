import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { invoke } from "@tauri-apps/api/core"
import { GitBranch, Terminal } from "lucide-react"
import { AddRepositoryDialog } from "./add-repository-dialog"
import { GitChangesCard } from "./git-changes-card"
import { RepositorySidebar } from "./repository-sidebar"
import { TerminalCard } from "./terminal-card"
import type { PanelImperativeHandle } from "react-resizable-panels"

import type {
  ChatItem,
  Conversation,
  ConversationState,
  ConversationStatus,
  MessageState,
} from "@/components/main/jarvis-types"
import type { ChatMessage } from "@/lib/provider-types"
import type { Repository } from "@/lib/code-types"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConversationComposer } from "@/components/main/conversation-composer"
import { ConversationThread } from "@/components/main/conversation-thread"
import { buildMessageId } from "@/components/main/jarvis-data"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useChatProvider } from "@/hooks/use-chat-provider"
import { useRepositories } from "@/hooks/use-repositories"
import { ModelSelector } from "@/components/main/model-selector"
// Store imports
import {
  useCodeDomainActions,
  useCodeDomainActiveConversation,
  useCodeDomainConversations,
  useCodeDomainHasRunningExecution,
  useCodeDomainStore,
} from "@/stores/code-domain-store"
import {
  useChatActions,
  useComposerValue,
  useSelectedModel,
  useSelectedProvider,
  useTone,
} from "@/stores/chat-store"
import {
  useAuthStatus,
  useOllamaConnected,
  useOllamaModels,
} from "@/stores/provider-store"

// ============================================================================
// Types for database communication
// ============================================================================

interface DbConversationSummary {
  id: string
  title: string
  summary: string
  status: string
  state: string
  created_at: number
  updated_at: number
  repository_id: string | null
}

interface DbMessageMeta {
  provider: string
  model: string
  tone: string
}

interface DbMessage {
  id: string
  conversation_id: string
  role: string
  state: string
  content: string
  created_at: number
  meta: DbMessageMeta
  sort_order: number
}

interface DbConversation {
  id: string
  title: string
  summary: string
  status: string
  state: string
  created_at: number
  updated_at: number
  repository_id: string | null
  messages: Array<DbMessage>
}

function dbMessageToChatItem(msg: DbMessage): ChatItem {
  return {
    id: msg.id,
    kind: "message",
    message: {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      state: msg.state as MessageState,
      content: msg.content,
      createdAt: msg.created_at,
      meta: {
        provider: msg.meta.provider,
        model: msg.meta.model,
        tone: msg.meta.tone,
      },
    },
  }
}

function dbConversationToConversation(dbConv: DbConversation): Conversation {
  return {
    id: dbConv.id,
    title: dbConv.title,
    summary: dbConv.summary,
    status: dbConv.status as ConversationStatus,
    state: dbConv.state as ConversationState,
    createdAt: dbConv.created_at,
    updatedAt: dbConv.updated_at,
    repositoryId: dbConv.repository_id ?? undefined,
    items: dbConv.messages.map(dbMessageToChatItem),
  }
}

function dbSummaryToConversation(summary: DbConversationSummary): Conversation {
  return {
    id: summary.id,
    title: summary.title,
    summary: summary.summary,
    status: summary.status as ConversationStatus,
    state: summary.state as ConversationState,
    createdAt: summary.created_at,
    updatedAt: summary.updated_at,
    repositoryId: summary.repository_id ?? undefined,
    items: [],
  }
}

// ============================================================================
// Context for DB operations
// ============================================================================

interface MessageInput {
  id: string
  role: string
  state: string
  content: string
  createdAt: number
  provider: string
  model: string
  tone: string
}

interface CodeDomainContextValue {
  loadConversation: (id: string) => Promise<Conversation | null>
  createConversation: (
    title: string,
    repositoryId: string,
  ) => Promise<Conversation | null>
  deleteConversation: (id: string) => Promise<boolean>
  addMessage: (
    conversationId: string,
    message: MessageInput,
  ) => Promise<boolean>
}

const CodeDomainContext = createContext<CodeDomainContextValue | null>(null)

function useCodeDomainContext() {
  const ctx = useContext(CodeDomainContext)
  if (!ctx)
    throw new Error(
      "useCodeDomainContext must be used within CodeDomainProvider",
    )
  return ctx
}

// ============================================================================
// Code Domain Provider - loads conversations with repository_id
// ============================================================================

interface CodeDomainProviderProps {
  children: React.ReactNode
}

function CodeDomainProvider({ children }: CodeDomainProviderProps) {
  const {
    setConversations,
    setIsLoading,
    setError,
    addConversation,
    removeConversation,
    markConversationLoaded,
    isConversationLoaded,
  } = useCodeDomainActions()

  // Load conversations on mount (only those with repository_id)
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const summaries = await invoke<Array<DbConversationSummary>>(
          "db_list_conversations",
        )
        // Filter to only include conversations WITH repository_id
        const codeConversations = summaries
          .filter((s) => s.repository_id !== null)
          .map(dbSummaryToConversation)
        setConversations(codeConversations)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()
  }, [setConversations, setIsLoading, setError])

  const loadConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      if (isConversationLoaded(id)) {
        return (
          useCodeDomainStore
            .getState()
            .conversations.find((c) => c.id === id) ?? null
        )
      }

      try {
        const dbConv = await invoke<DbConversation | null>(
          "db_get_conversation",
          { id },
        )
        if (!dbConv) return null

        const conversation = dbConversationToConversation(dbConv)
        markConversationLoaded(id)

        // Update in store
        const { conversations, setConversations: setConvs } =
          useCodeDomainStore.getState()
        const index = conversations.findIndex((c) => c.id === id)
        if (index !== -1) {
          const next = [...conversations]
          next[index] = conversation
          setConvs(next)
        }

        return conversation
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [isConversationLoaded, markConversationLoaded, setError],
  )

  const createConversation = useCallback(
    async (
      title: string,
      repositoryId: string,
    ): Promise<Conversation | null> => {
      try {
        const dbConv = await invoke<DbConversation>("db_create_conversation", {
          title,
          repositoryId,
        })
        const conversation = dbConversationToConversation(dbConv)
        markConversationLoaded(conversation.id)
        addConversation(conversation)
        return conversation
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [addConversation, markConversationLoaded, setError],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await invoke<boolean>("db_delete_conversation", { id })
        removeConversation(id)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [removeConversation, setError],
  )

  const addMessage = useCallback(
    async (
      conversationId: string,
      message: MessageInput,
    ): Promise<boolean> => {
      try {
        await invoke("db_add_message", {
          conversationId,
          id: message.id,
          role: message.role,
          messageState: message.state,
          content: message.content,
          createdAt: message.createdAt,
          provider: message.provider,
          model: message.model,
          tone: message.tone,
        })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [setError],
  )

  const value: CodeDomainContextValue = {
    loadConversation,
    createConversation,
    deleteConversation,
    addMessage,
  }

  return (
    <CodeDomainContext.Provider value={value}>
      {children}
    </CodeDomainContext.Provider>
  )
}

// ============================================================================
// CodeTab Context (repository + conversation selection)
// ============================================================================

interface CodeTabContextValue {
  // Repository state
  repositories: Array<Repository>
  activeRepositoryId: string | null
  activeRepository: Repository | undefined
  // Actions
  setActiveRepositoryId: (id: string | null) => void
  handleSelectRepository: (repoId: string) => Promise<void>
  handleSelectConversation: (convId: string) => Promise<void>
  handleAddRepository: (
    name: string,
    path: string,
    branch?: string,
  ) => Promise<void>
  handleDeleteRepository: (repoId: string) => Promise<void>
  handleNewConversation: (repoId?: string) => Promise<void>
  // Dialog state
  isAddRepoDialogOpen: boolean
  setIsAddRepoDialogOpen: (open: boolean) => void
}

const CodeTabContext = createContext<CodeTabContextValue | null>(null)

function useCodeTabContext() {
  const ctx = useContext(CodeTabContext)
  if (!ctx)
    throw new Error("useCodeTabContext must be used within CodeTabProvider")
  return ctx
}

interface CodeTabProviderProps {
  children: React.ReactNode
}

export function CodeTabProvider({ children }: CodeTabProviderProps) {
  const { repositories, createRepository, deleteRepository } =
    useRepositories()

  // Code domain store
  const conversations = useCodeDomainConversations()
  const {
    setActiveConversationId,
  } = useCodeDomainActions()

  // Context for DB operations
  const { loadConversation, createConversation } = useCodeDomainContext()

  // UI State
  const [isAddRepoDialogOpen, setIsAddRepoDialogOpen] = useState(false)
  const [activeRepositoryId, setActiveRepositoryId] = useState<string | null>(
    null,
  )

  // Get active repository
  const activeRepository = useMemo(
    () => repositories.find((r) => r.id === activeRepositoryId),
    [repositories, activeRepositoryId],
  )

  // Handlers
  const handleSelectRepository = useCallback(
    async (repoId: string) => {
      setActiveRepositoryId(repoId)
      // Auto-select first conversation for this repo
      const repoConvs = conversations.filter(
        (c) => c.repositoryId === repoId,
      )
      if (repoConvs.length > 0) {
        setActiveConversationId(repoConvs[0].id)
        if (repoConvs[0].items.length === 0) {
          await loadConversation(repoConvs[0].id)
        }
      } else {
        setActiveConversationId(null)
      }
    },
    [conversations, loadConversation, setActiveConversationId],
  )

  const handleSelectConversation = useCallback(
    async (convId: string) => {
      setActiveConversationId(convId)
      const conv = conversations.find((c) => c.id === convId)
      if (conv && conv.items.length === 0) {
        await loadConversation(convId)
      }
    },
    [conversations, loadConversation, setActiveConversationId],
  )

  const handleAddRepository = useCallback(
    async (name: string, path: string, branch?: string) => {
      const repo = await createRepository(name, path, branch)
      if (repo) {
        setActiveRepositoryId(repo.id)
      }
    },
    [createRepository],
  )

  const handleDeleteRepository = useCallback(
    async (repoId: string) => {
      await deleteRepository(repoId)
      if (activeRepositoryId === repoId) {
        setActiveRepositoryId(null)
        setActiveConversationId(null)
      }
    },
    [deleteRepository, activeRepositoryId, setActiveConversationId],
  )

  const handleNewConversation = useCallback(
    async (repoId?: string) => {
      const targetRepoId = repoId ?? activeRepositoryId
      if (!targetRepoId) return

      // Check for existing empty conversation
      const existingEmpty = conversations.find(
        (c) => c.repositoryId === targetRepoId && c.items.length === 0,
      )
      if (existingEmpty) {
        setActiveConversationId(existingEmpty.id)
        return
      }

      // Create new conversation linked to repository
      const newConv = await createConversation(
        "New conversation",
        targetRepoId,
      )
      if (newConv) {
        setActiveConversationId(newConv.id)
      }
    },
    [
      activeRepositoryId,
      conversations,
      createConversation,
      setActiveConversationId,
    ],
  )

  const value: CodeTabContextValue = {
    repositories,
    activeRepositoryId,
    activeRepository,
    setActiveRepositoryId,
    handleSelectRepository,
    handleSelectConversation,
    handleAddRepository,
    handleDeleteRepository,
    handleNewConversation,
    isAddRepoDialogOpen,
    setIsAddRepoDialogOpen,
  }

  return (
    <CodeTabContext.Provider value={value}>
      {children}
      <AddRepositoryDialog
        open={isAddRepoDialogOpen}
        onOpenChange={setIsAddRepoDialogOpen}
        onAdd={handleAddRepository}
      />
    </CodeTabContext.Provider>
  )
}

// ============================================================================
// Sidebar component
// ============================================================================

export function CodeTabSidebar() {
  const ctx = useCodeTabContext()
  const conversations = useCodeDomainConversations()
  const activeConversationId =
    useCodeDomainStore((s) => s.activeConversationId)

  // Filter conversations for the active repository
  const repoConversations = useMemo(
    () =>
      conversations.filter((c) => c.repositoryId === ctx.activeRepositoryId),
    [conversations, ctx.activeRepositoryId],
  )

  return (
    <RepositorySidebar
      repositories={ctx.repositories}
      conversations={repoConversations}
      activeRepositoryId={ctx.activeRepositoryId}
      activeConversationId={activeConversationId}
      onSelectRepository={ctx.handleSelectRepository}
      onSelectConversation={ctx.handleSelectConversation}
      onAddRepository={() => ctx.setIsAddRepoDialogOpen(true)}
      onDeleteRepository={ctx.handleDeleteRepository}
      onNewConversation={ctx.handleNewConversation}
    />
  )
}

// ============================================================================
// Workspace component (main content area)
// ============================================================================

export function CodeTabWorkspace() {
  const ctx = useCodeTabContext()

  const streamingStatesRef = useRef<
    Map<
      string,
      { messageId: string; accumulatedContent: string; sessionId: string }
    >
  >(new Map())

  // Domain store state
  const activeConversation = useCodeDomainActiveConversation()
  const hasRunningExecution = useCodeDomainHasRunningExecution()
  const { updateConversations } = useCodeDomainActions()

  // Chat store state (shared)
  const composerValue = useComposerValue()
  const provider = useSelectedProvider()
  const model = useSelectedModel()
  const tone = useTone()
  const { clearComposer, setSelectedModel } = useChatActions()

  // Provider store state
  const isOllamaConnected = useOllamaConnected()
  const ollamaModels = useOllamaModels()
  const authStatus = useAuthStatus()

  // Context hooks
  const { addMessage } = useCodeDomainContext()

  // Streaming hook
  const { startChatStream } = useChatProvider()

  // Panel refs for collapsible panels
  const terminalPanelRef = useRef<PanelImperativeHandle>(null)
  const gitChangesPanelRef = useRef<PanelImperativeHandle>(null)

  // Collapsed state tracking (for button styling)
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(true)
  const [isGitChangesCollapsed, setIsGitChangesCollapsed] = useState(true)

  // Auto-select first model
  useEffect(() => {
    if (provider === "ollama" && ollamaModels.length > 0 && !model) {
      setSelectedModel(ollamaModels[0].name)
    }
  }, [ollamaModels, model, provider, setSelectedModel])

  // Toggle handlers for collapsible panels
  const toggleTerminal = useCallback(() => {
    const panel = terminalPanelRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
        setIsTerminalCollapsed(false)
      } else {
        panel.collapse()
        setIsTerminalCollapsed(true)
      }
    }
  }, [])

  const toggleGitChanges = useCallback(() => {
    const panel = gitChangesPanelRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
        setIsGitChangesCollapsed(false)
      } else {
        panel.collapse()
        setIsGitChangesCollapsed(true)
      }
    }
  }, [])

  // Keyboard shortcuts for panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command + J for Terminal
      if (e.metaKey && !e.altKey && e.code === "KeyJ") {
        e.preventDefault()
        toggleTerminal()
      }
      // Command + Option + B for Git
      if (e.metaKey && e.altKey && e.code === "KeyB") {
        e.preventDefault()
        toggleGitChanges()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleTerminal, toggleGitChanges])

  const handleSendMessage = useCallback(async () => {
    if (!activeConversation || !composerValue.trim()) return
    if (
      hasRunningExecution ||
      streamingStatesRef.current.has(activeConversation.id)
    )
      return
    if (!model) return

    // Check provider availability
    if (provider === "ollama" && !isOllamaConnected) return
    if (provider === "openai" && !authStatus?.openai.is_configured) return
    if (provider === "anthropic" && !authStatus?.anthropic.is_configured)
      return

    const now = Date.now()
    const messageId = buildMessageId()
    const assistantId = buildMessageId()
    const sessionId = `session-${now}`
    const userContent = composerValue.trim()
    const conversationId = activeConversation.id

    // Register streaming state
    streamingStatesRef.current.set(conversationId, {
      messageId: assistantId,
      accumulatedContent: "",
      sessionId,
    })

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
    }

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
    }

    const nextTitle =
      activeConversation.title === "New conversation" ||
      activeConversation.items.length === 0
        ? userContent.slice(0, 32)
        : activeConversation.title

    updateConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation
        return {
          ...conversation,
          title: nextTitle,
          summary: userContent.slice(0, 60) || conversation.summary,
          status: "running" as ConversationStatus,
          updatedAt: now,
          items: [...conversation.items, userMessage, assistantMessage],
        }
      }),
    )

    clearComposer()

    await addMessage(conversationId, {
      id: messageId,
      role: "user",
      state: "normal",
      content: userContent,
      createdAt: now,
      provider,
      model,
      tone,
    })

    if (nextTitle !== activeConversation.title) {
      invoke("db_update_conversation", {
        id: conversationId,
        title: nextTitle,
        summary: userContent.slice(0, 60),
        status: null,
        conversationState: null,
      })
    }

    const conversationHistory: Array<ChatMessage> = activeConversation.items
      .filter((item) => item.kind === "message")
      .map((item) => ({
        role: item.message.role as "user" | "assistant" | "system",
        content: item.message.content,
      }))

    conversationHistory.push({ role: "user", content: userContent })

    startChatStream({
      sessionId,
      provider,
      model,
      messages: conversationHistory,
      temperature: 0.7,
      maxTokens: 4096,
      onChunk: (content, done) => {
        const state = streamingStatesRef.current.get(conversationId)
        if (!state) return

        state.accumulatedContent += content
        const currentContent = state.accumulatedContent
        const currentMessageId = state.messageId

        updateConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item
              return {
                ...item,
                message: {
                  ...item.message,
                  content: currentContent,
                  state: (done ? "normal" : "streaming") as MessageState,
                  streamedChars: currentContent.length,
                },
              }
            })

            return {
              ...conversation,
              status: (done ? "idle" : "running") as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            }
          }),
        )

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
          })

          streamingStatesRef.current.delete(conversationId)
        }
      },
      onError: (error) => {
        const state = streamingStatesRef.current.get(conversationId)
        if (!state) return

        const currentMessageId = state.messageId
        const errorContent = error || "An error occurred"

        updateConversations((prev) =>
          prev.map((conversation) => {
            if (conversation.id !== conversationId) return conversation

            const nextItems = conversation.items.map((item) => {
              if (item.id !== currentMessageId || item.kind !== "message")
                return item
              return {
                ...item,
                message: {
                  ...item.message,
                  content: errorContent,
                  state: "error" as MessageState,
                },
              }
            })

            return {
              ...conversation,
              status: "error" as ConversationStatus,
              updatedAt: Date.now(),
              items: nextItems,
            }
          }),
        )

        addMessage(conversationId, {
          id: currentMessageId,
          role: "assistant",
          state: "error",
          content: errorContent,
          createdAt: Date.now(),
          provider,
          model,
          tone,
        })

        streamingStatesRef.current.delete(conversationId)
      },
    })
  }, [
    activeConversation,
    composerValue,
    hasRunningExecution,
    isOllamaConnected,
    model,
    provider,
    authStatus,
    tone,
    startChatStream,
    addMessage,
    updateConversations,
    clearComposer,
  ])

  const repoPath = ctx.activeRepository?.path

  // Show empty state if no repository selected
  if (!ctx.activeRepositoryId) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-zinc-500">
        <p className="text-sm">Select a repository to start coding</p>
        <p className="mt-1 text-xs text-zinc-600">
          Add a repository using the + button in the sidebar
        </p>
      </div>
    )
  }

  return (
    <section className="my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full">
        {/* Left side: Chat + Terminal */}
        <ResizablePanel defaultSize={100} minSize={30}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Chat area - takes full space when terminal collapsed */}
            <ResizablePanel defaultSize={70} minSize={30}>
              <div className="border-border bg-background relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border">
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  {/* Toggle buttons at top-right */}
                  <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-expanded={!isTerminalCollapsed}
                          onClick={toggleTerminal}
                        >
                          <Terminal className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span className="flex items-center gap-2">
                          {isTerminalCollapsed
                            ? "Show Terminal"
                            : "Hide Terminal"}
                          <Kbd>⌘J</Kbd>
                        </span>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-expanded={!isGitChangesCollapsed}
                          onClick={toggleGitChanges}
                        >
                          <GitBranch className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span className="flex items-center gap-2">
                          {isGitChangesCollapsed
                            ? "Show Git Changes"
                            : "Hide Git Changes"}
                          <Kbd>⌘⌥B</Kbd>
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <ConversationThread
                    activeConversation={activeConversation}
                    onViewRun={() => {}}
                  />
                  <ConversationComposer
                    onSendMessage={handleSendMessage}
                    onNewConversation={() => ctx.handleNewConversation()}
                    modelSelector={<ModelSelector />}
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

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

        <ResizableHandle />

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
  )
}

// ============================================================================
// Wrapped exports - CodeDomainProvider wraps CodeTabProvider
// ============================================================================

export function CodeTabWithProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CodeDomainProvider>
      <CodeTabProvider>{children}</CodeTabProvider>
    </CodeDomainProvider>
  )
}

// Legacy export for backwards compatibility
export function CodeTab() {
  return <CodeTabSidebar />
}
