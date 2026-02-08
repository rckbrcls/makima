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
import { Play } from "lucide-react"
import { AddRepositoryDialog } from "./add-repository-dialog"
import { CliEmptyState, CliTerminalCard } from "./cli-terminal-card"
import { CliToolbar } from "./cli-toolbar"
import { GitChangesCard } from "./git-changes-card"
import { RepositorySidebar } from "./repository-sidebar"
import type { PanelImperativeHandle } from "react-resizable-panels"
import type { Repository } from "@/lib/code-types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useAiCliDetection } from "@/hooks/use-ai-cli-detection"
import { useCliSessionsDb } from "@/hooks/use-cli-sessions"
import { useRepositories } from "@/hooks/use-repositories"
import {
  useAgentPanelCollapsed,
  useCliActiveSessionId,
  useCliGitPollInterval,
  useCliSessionActions,
  useCliSessionStore,
  useCliSessions,
  useCodeLayoutActions,
  useCodeLayoutHydrated,
  useCodeLayoutStore,
  useCodePanelLayout,
  useGitPanelCollapsed,
  useInstalledClis,
  useLastActiveRepositoryId,
  useSelectedCliCommand,
} from "@/stores"

// ============================================================================
// CodeTab Context (repository management only)
// ============================================================================

interface CodeTabContextValue {
  repositories: Array<Repository>
  activeRepositoryId: string | null
  activeRepository: Repository | undefined
  setActiveRepositoryId: (id: string | null) => void
  handleSelectRepository: (repoId: string) => void
  handleSelectSession: (sessionId: string) => void
  handleAddRepository: (
    name: string,
    path: string,
    branch?: string,
  ) => Promise<void>
  handleDeleteRepository: (repoId: string) => Promise<void>
  handleRenameRepository: (repoId: string, newName: string) => Promise<void>
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

// ============================================================================
// CodeTab Provider - simplified, no conversation management
// ============================================================================

interface CodeTabProviderProps {
  children: React.ReactNode
}

export function CodeTabProvider({ children }: CodeTabProviderProps) {
  const { repositories, createRepository, deleteRepository, updateRepository } =
    useRepositories()
  const {
    setActiveRepositoryId: setCliActiveRepoId,
    setActiveSessionId,
  } = useCliSessionActions()
  const sessions = useCliSessions()
  const lastActiveRepoId = useLastActiveRepositoryId()
  const isHydrated = useCodeLayoutHydrated()
  const { setLastActiveRepositoryId } = useCodeLayoutActions()

  const [isAddRepoDialogOpen, setIsAddRepoDialogOpen] = useState(false)
  const [activeRepositoryId, setActiveRepositoryId] = useState<string | null>(
    null,
  )

  // Restore last active repository on mount after hydration
  const hasRestoredRepo = useRef(false)
  useEffect(() => {
    if (!isHydrated || hasRestoredRepo.current || repositories.length === 0) return
    hasRestoredRepo.current = true
    if (lastActiveRepoId && repositories.some((r) => r.id === lastActiveRepoId)) {
      setActiveRepositoryId(lastActiveRepoId)
      setCliActiveRepoId(lastActiveRepoId)
    }
  }, [isHydrated, lastActiveRepoId, repositories, setCliActiveRepoId])

  const activeRepository = useMemo(
    () => repositories.find((r) => r.id === activeRepositoryId),
    [repositories, activeRepositoryId],
  )

  const handleSelectRepository = useCallback(
    (repoId: string) => {
      setActiveRepositoryId(repoId)
      setCliActiveRepoId(repoId)
      setLastActiveRepositoryId(repoId)

      // Auto-select the best session for this repo (prefer running, fallback to most recent)
      let bestSession: { id: string; startedAt: number; running: boolean } | null = null
      for (const session of sessions.values()) {
        if (session.repositoryId !== repoId) continue
        const isRunning = session.status === "running"
        if (
          !bestSession ||
          (isRunning && !bestSession.running) ||
          (isRunning === bestSession.running && session.startedAt > bestSession.startedAt)
        ) {
          bestSession = { id: session.id, startedAt: session.startedAt, running: isRunning }
        }
      }
      setActiveSessionId(bestSession?.id ?? null)
    },
    [setCliActiveRepoId, setActiveSessionId, sessions, setLastActiveRepositoryId],
  )

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId)
    },
    [setActiveSessionId],
  )

  const handleAddRepository = useCallback(
    async (name: string, path: string, branch?: string) => {
      const repo = await createRepository(name, path, branch)
      if (repo) {
        setActiveRepositoryId(repo.id)
        setCliActiveRepoId(repo.id)
        setActiveSessionId(null)
      }
    },
    [createRepository, setCliActiveRepoId, setActiveSessionId],
  )

  const handleDeleteRepository = useCallback(
    async (repoId: string) => {
      await deleteRepository(repoId)
      if (activeRepositoryId === repoId) {
        setActiveRepositoryId(null)
        setCliActiveRepoId(null)
        setActiveSessionId(null)
      }
    },
    [deleteRepository, activeRepositoryId, setCliActiveRepoId, setActiveSessionId],
  )

  const handleRenameRepository = useCallback(
    async (repoId: string, newName: string) => {
      await updateRepository(repoId, { name: newName })
    },
    [updateRepository],
  )

  const value: CodeTabContextValue = {
    repositories,
    activeRepositoryId,
    activeRepository,
    setActiveRepositoryId,
    handleSelectRepository,
    handleSelectSession,
    handleAddRepository,
    handleDeleteRepository,
    handleRenameRepository,
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
  const sessions = useCliSessions()
  const activeSessionId = useCliActiveSessionId()
  const selectedCommand = useSelectedCliCommand()
  const installedClis = useInstalledClis()
  const {
    createSession,
    updateSessionStatus,
    removeSession,
    setActiveSessionId,
    resetSession,
    addSpawning,
    removeSpawning,
  } = useCliSessionActions()
  const { createSessionDb, updateSessionDb, deleteSessionDb } =
    useCliSessionsDb()

  const handleStopSession = useCallback(
    (sessionId: string) => {
      const session = sessions.get(sessionId)
      if (!session) return
      removeSpawning(sessionId)
      if (session.ptySessionId) {
        invoke("pty_kill", { sessionId: session.ptySessionId }).catch(() => {})
      }
      updateSessionStatus(sessionId, "exited")
      updateSessionDb(sessionId, { status: "exited" })
    },
    [sessions, updateSessionStatus, removeSpawning, updateSessionDb],
  )

  const handleRestartSession = useCallback(
    (sessionId: string) => {
      const session = sessions.get(sessionId)
      if (!session) return

      // Stop current
      removeSpawning(sessionId)
      if (session.ptySessionId) {
        invoke("pty_kill", { sessionId: session.ptySessionId }).catch(() => {})
      }
      updateSessionStatus(sessionId, "exited")
      updateSessionDb(sessionId, { status: "exited" })

      // Reset SAME session and trigger spawn after brief delay
      setTimeout(() => {
        resetSession(sessionId)
        setActiveSessionId(sessionId)
        addSpawning(sessionId)
      }, 200)
    },
    [sessions, updateSessionStatus, resetSession, setActiveSessionId, addSpawning, removeSpawning, updateSessionDb],
  )

  const handleRemoveSession = useCallback(
    (sessionId: string) => {
      const session = sessions.get(sessionId)
      if (session?.ptySessionId && session.status === "running") {
        invoke("pty_kill", { sessionId: session.ptySessionId }).catch(() => {})
      }
      removeSession(sessionId)
      deleteSessionDb(sessionId)
    },
    [sessions, removeSession, deleteSessionDb],
  )

  const handleNewSession = useCallback(
    (repoId: string) => {
      const cli = installedClis.find((c) => c.command === selectedCommand)
      if (!selectedCommand || !cli) return
      const sessionId = `cli-${Date.now()}`
      createSession({
        id: sessionId,
        repositoryId: repoId,
        cliName: cli.name,
        cliCommand: selectedCommand,
        ptySessionId: null,
        status: "idle",
        startedAt: Date.now(),
      })
      createSessionDb(sessionId, repoId, cli.name, selectedCommand)
      setActiveSessionId(sessionId)
    },
    [selectedCommand, installedClis, createSession, setActiveSessionId, createSessionDb],
  )

  return (
    <RepositorySidebar
      repositories={ctx.repositories}
      activeRepositoryId={ctx.activeRepositoryId}
      activeSessionId={activeSessionId}
      onSelectRepository={ctx.handleSelectRepository}
      onSelectSession={ctx.handleSelectSession}
      onAddRepository={() => ctx.setIsAddRepoDialogOpen(true)}
      onDeleteRepository={ctx.handleDeleteRepository}
      onRenameRepository={ctx.handleRenameRepository}
      onNewSession={handleNewSession}
      onStopSession={handleStopSession}
      onRestartSession={handleRestartSession}
      onRemoveSession={handleRemoveSession}
      sessions={sessions}
    />
  )
}

// ============================================================================
// Workspace component (main content area)
// ============================================================================

export function CodeTabWorkspace() {
  const ctx = useCodeTabContext()
  const { clis, installedClis } = useAiCliDetection()
  const {
    setAvailableClis,
    createSession,
    setActiveSessionId,
    addSpawning,
    updateSessionCli,
  } = useCliSessionActions()
  const selectedCommand = useSelectedCliCommand()
  const activeSessionId = useCliActiveSessionId()
  const sessions = useCliSessions()
  const pollInterval = useCliGitPollInterval()
  const { loadSessions, createSessionDb, updateSessionDb, deleteSessionDb } =
    useCliSessionsDb()

  // Hydrate sessions from DB on mount
  const hasHydrated = useRef(false)
  useEffect(() => {
    if (hasHydrated.current) return
    hasHydrated.current = true
    loadSessions()
  }, [loadSessions])

  // Sync all detected CLIs to store
  useEffect(() => {
    if (clis.length > 0) {
      setAvailableClis(clis)
    }
  }, [clis, setAvailableClis])

  const repoPath = ctx.activeRepository?.path
  const repoId = ctx.activeRepositoryId

  const selectedCli = useMemo(
    () => installedClis.find((c) => c.command === selectedCommand),
    [installedClis, selectedCommand],
  )

  // All sessions as array for rendering the pool
  const allSessions = useMemo(() => [...sessions.values()], [sessions])

  // Check if current repo has any sessions
  const repoHasNoSessions = useMemo(
    () => !allSessions.some((s) => s.repositoryId === repoId),
    [allSessions, repoId],
  )

  const handleStart = useCallback(() => {
    if (!repoId || !selectedCommand || !selectedCli) return

    // Read latest session directly from store to avoid stale closures
    const { activeSessionId: currentId, sessions: storeSessions } =
      useCliSessionStore.getState()
    const current = currentId ? storeSessions.get(currentId) ?? null : null

    // Reuse existing session if it's exited or errored
    if (
      current &&
      current.repositoryId === repoId &&
      (current.status === "exited" || current.status === "error")
    ) {
      const { resetSession } = useCliSessionStore.getState()
      // Sync CLI selector to session before starting
      updateSessionCli(current.id, selectedCommand, selectedCli.name)
      updateSessionDb(current.id, {
        status: "idle",
        cliCommand: selectedCommand,
        cliName: selectedCli.name,
      })
      resetSession(current.id)
      addSpawning(current.id)
      return
    }

    // First time — create a new session
    const sessionId = `cli-${Date.now()}`
    createSession({
      id: sessionId,
      repositoryId: repoId,
      cliName: selectedCli.name,
      cliCommand: selectedCommand,
      ptySessionId: null,
      status: "idle",
      startedAt: Date.now(),
    })
    createSessionDb(sessionId, repoId, selectedCli.name, selectedCommand)
    setActiveSessionId(sessionId)
    addSpawning(sessionId)
  }, [repoId, selectedCommand, selectedCli, createSession, setActiveSessionId, addSpawning, createSessionDb, updateSessionDb, updateSessionCli])

  const handleNewSession = useCallback(
    (forRepoId?: string) => {
      const targetRepoId = forRepoId ?? repoId
      if (!targetRepoId || !selectedCommand || !selectedCli) return

      const sessionId = `cli-${Date.now()}`
      createSession({
        id: sessionId,
        repositoryId: targetRepoId,
        cliName: selectedCli.name,
        cliCommand: selectedCommand,
        ptySessionId: null,
        status: "idle",
        startedAt: Date.now(),
      })
      createSessionDb(sessionId, targetRepoId, selectedCli.name, selectedCommand)
      setActiveSessionId(sessionId)
      addSpawning(sessionId)
    },
    [repoId, selectedCommand, selectedCli, createSession, setActiveSessionId, addSpawning, createSessionDb],
  )

  // Persisted layout state
  const isAgentCollapsed = useAgentPanelCollapsed()
  const isGitCollapsed = useGitPanelCollapsed()
  const savedLayout = useCodePanelLayout()
  const isHydrated = useCodeLayoutHydrated()
  const {
    setAgentPanelCollapsed,
    setGitPanelCollapsed,
    setPanelLayout,
  } = useCodeLayoutActions()

  // Agent panel collapse
  const agentPanelRef = useRef<PanelImperativeHandle | null>(null)

  const handleAgentPanelResize = useCallback(() => {
    const panel = agentPanelRef.current
    if (panel) {
      const collapsed = panel.isCollapsed()
      if (collapsed !== useCodeLayoutStore.getState().agentPanelCollapsed) {
        setAgentPanelCollapsed(collapsed)
      }
    }
  }, [setAgentPanelCollapsed])

  const toggleAgentPanel = useCallback(() => {
    const panel = agentPanelRef.current
    if (!panel) return
    if (panel.isCollapsed()) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }, [])

  // Git panel collapse
  const gitPanelRef = useRef<PanelImperativeHandle | null>(null)

  const handleGitPanelResize = useCallback(() => {
    const panel = gitPanelRef.current
    if (panel) {
      const collapsed = panel.isCollapsed()
      if (collapsed !== useCodeLayoutStore.getState().gitPanelCollapsed) {
        setGitPanelCollapsed(collapsed)
      }
    }
  }, [setGitPanelCollapsed])

  const toggleGitPanel = useCallback(() => {
    const panel = gitPanelRef.current
    if (!panel) return
    if (panel.isCollapsed()) {
      panel.expand()
    } else {
      panel.collapse()
    }
  }, [])

  // Persist panel layout on resize (fires after pointer release)
  // Layout is keyed by panel id: { "agent-panel": number, "git-panel": number }
  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      setPanelLayout(layout)
    },
    [setPanelLayout],
  )

  // Restore collapsed state on mount after hydration
  const hasRestoredPanels = useRef(false)
  useEffect(() => {
    if (!isHydrated || hasRestoredPanels.current) return
    hasRestoredPanels.current = true
    const state = useCodeLayoutStore.getState()
    requestAnimationFrame(() => {
      if (state.agentPanelCollapsed) agentPanelRef.current?.collapse()
      if (state.gitPanelCollapsed) gitPanelRef.current?.collapse()
    })
  }, [isHydrated])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ⌘B — toggle agent panel
      if (e.metaKey && !e.altKey && e.code === "KeyB") {
        e.preventDefault()
        toggleAgentPanel()
      }
      // ⌥⌘B — toggle git panel
      if (e.metaKey && e.altKey && e.code === "KeyB") {
        e.preventDefault()
        toggleGitPanel()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggleAgentPanel, toggleGitPanel])

  // Show empty state if no repository selected
  if (!ctx.activeRepositoryId) {
    return (
      <div className="text-muted-foreground flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center">
        <p className="text-sm">Select a repository to start coding</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Add a repository using the + button in the sidebar
        </p>
      </div>
    )
  }

  return (
    <section className="my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      {/* Toolbar */}
      <CliToolbar
        repositoryName={ctx.activeRepository?.name}
        isAgentPanelCollapsed={isAgentCollapsed}
        onToggleAgentPanel={toggleAgentPanel}
        isGitPanelCollapsed={isGitCollapsed}
        onToggleGitPanel={toggleGitPanel}
      />

      {/* Main content: Terminal + Git Changes */}
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full min-h-0 w-full"
        onLayoutChanged={handleLayoutChanged}
      >
        {/* Terminal pool - collapsible agent panel */}
        <ResizablePanel
          id="agent-panel"
          panelRef={agentPanelRef}
          defaultSize={savedLayout?.["agent-panel"] ?? 60}
          minSize={30}
          collapsible
          collapsedSize={0}
          onResize={handleAgentPanelResize}
        >
          <div className="relative h-full min-h-0">
            {/* Empty state when no sessions exist for current repo */}
            {repoHasNoSessions && (
              <div className="bg-background border-border flex h-full flex-col overflow-hidden rounded-xl border">
                <div className="min-h-0 flex-1">
                  <CliEmptyState />
                </div>
                <div className="border-border flex items-center gap-2 border-t px-3 py-1.5">
                  {/* Connection indicator (disconnected) */}
                  <span className="bg-muted-foreground size-1.5 shrink-0 rounded-full" />

                  {/* CLI Selector */}
                  <select
                    value={selectedCommand ?? ""}
                    onChange={(e) => {
                      const store = useCliSessionStore.getState()
                      store.setSelectedCliCommand(e.target.value || null)
                    }}
                    className="bg-input text-foreground border-border h-6 rounded-md border px-2 text-xs focus:outline-none"
                  >
                    {installedClis.length === 0 && (
                      <option value="">No CLIs detected</option>
                    )}
                    {installedClis.map((cli) => (
                      <option key={cli.command} value={cli.command}>
                        {cli.name}
                        {cli.version ? ` (${cli.version})` : ""}
                      </option>
                    ))}
                  </select>

                  <div className="flex-1" />

                  <Button
                    variant="default"
                    size="xs"
                    onClick={handleStart}
                    disabled={!selectedCommand}
                  >
                    <Play className="mr-1 size-3" />
                    Start
                  </Button>
                </div>
              </div>
            )}

            {/* Stacked terminals — one per session, only active is visible */}
            {allSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "absolute inset-0",
                  session.id !== activeSessionId && "invisible",
                )}
              >
                <CliTerminalCard
                  sessionId={session.id}
                  isVisible={session.id === activeSessionId}
                  cwd={ctx.repositories.find((r) => r.id === session.repositoryId)?.path}
                  onNewSession={() => handleNewSession(session.repositoryId)}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </ResizablePanel>

        <ResizableHandle className="mx-1.5" />

        {/* Git Changes - collapsible side panel */}
        <ResizablePanel
          id="git-panel"
          panelRef={gitPanelRef}
          defaultSize={savedLayout?.["git-panel"] ?? 40}
          minSize={20}
          collapsible
          collapsedSize={0}
          onResize={handleGitPanelResize}
        >
          <GitChangesCard
            repoPath={repoPath}
            pollInterval={pollInterval}
            className="h-full"
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </section>
  )
}

// ============================================================================
// Wrapped export - no CodeDomainProvider needed
// ============================================================================

export function CodeTabWithProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <CodeTabProvider>{children}</CodeTabProvider>
}

// Legacy export for backwards compatibility
export function CodeTab() {
  return <CodeTabSidebar />
}
