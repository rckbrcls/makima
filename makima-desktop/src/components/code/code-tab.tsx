import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { AddRepositoryDialog } from "./add-repository-dialog"
import { CliTerminalCard } from "./cli-terminal-card"
import { CliToolbar } from "./cli-toolbar"
import { GitChangesCard } from "./git-changes-card"
import { RepositorySidebar } from "./repository-sidebar"
import type { Repository } from "@/lib/code-types"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useAiCliDetection } from "@/hooks/use-ai-cli-detection"
import { useRepositories } from "@/hooks/use-repositories"
import {
  useCliActiveSession,
  useCliActiveSessionId,
  useCliGitPollInterval,
  useCliSessionActions,
  useCliSessions,
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
  const { repositories, createRepository, deleteRepository } =
    useRepositories()
  const {
    setActiveRepositoryId: setCliActiveRepoId,
    setActiveSessionId,
  } = useCliSessionActions()
  const sessions = useCliSessions()

  const [isAddRepoDialogOpen, setIsAddRepoDialogOpen] = useState(false)
  const [activeRepositoryId, setActiveRepositoryId] = useState<string | null>(
    null,
  )

  const activeRepository = useMemo(
    () => repositories.find((r) => r.id === activeRepositoryId),
    [repositories, activeRepositoryId],
  )

  const handleSelectRepository = useCallback(
    (repoId: string) => {
      setActiveRepositoryId(repoId)
      setCliActiveRepoId(repoId)

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
    [setCliActiveRepoId, setActiveSessionId, sessions],
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

  const value: CodeTabContextValue = {
    repositories,
    activeRepositoryId,
    activeRepository,
    setActiveRepositoryId,
    handleSelectRepository,
    handleSelectSession,
    handleAddRepository,
    handleDeleteRepository,
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

  return (
    <RepositorySidebar
      repositories={ctx.repositories}
      activeRepositoryId={ctx.activeRepositoryId}
      activeSessionId={activeSessionId}
      onSelectRepository={ctx.handleSelectRepository}
      onSelectSession={ctx.handleSelectSession}
      onAddRepository={() => ctx.setIsAddRepoDialogOpen(true)}
      onDeleteRepository={ctx.handleDeleteRepository}
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
    updateSessionStatus,
    updateSessionPty,
    setActiveSessionId,
  } = useCliSessionActions()
  const selectedCommand = useSelectedCliCommand()
  const activeSession = useCliActiveSession()
  const activeSessionId = useCliActiveSessionId()
  const pollInterval = useCliGitPollInterval()

  // Track which sessions have been told to spawn (by session ID)
  const [spawningSessions, setSpawningSessions] = useState<Set<string>>(
    new Set(),
  )
  // Use ref to avoid stale closures in setTimeout
  const spawningSessionsRef = useRef(spawningSessions)
  useEffect(() => {
    spawningSessionsRef.current = spawningSessions
  }, [spawningSessions])

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

  const handleStart = useCallback(() => {
    if (!repoId || !selectedCommand || !selectedCli) return

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

    setActiveSessionId(sessionId)
    setSpawningSessions((prev) => new Set(prev).add(sessionId))
  }, [repoId, selectedCommand, selectedCli, createSession, setActiveSessionId])

  const handleStop = useCallback(() => {
    if (!activeSessionId) return
    setSpawningSessions((prev) => {
      const next = new Set(prev)
      next.delete(activeSessionId)
      return next
    })
    updateSessionStatus(activeSessionId, "exited")
  }, [activeSessionId, updateSessionStatus])

  const handleRestart = useCallback(() => {
    if (!activeSessionId || !repoId || !selectedCommand || !selectedCli) return

    // Stop current
    setSpawningSessions((prev) => {
      const next = new Set(prev)
      next.delete(activeSessionId)
      return next
    })
    updateSessionStatus(activeSessionId, "exited")

    // Brief delay to allow cleanup before respawn
    setTimeout(() => {
      const newSessionId = `cli-${Date.now()}`

      createSession({
        id: newSessionId,
        repositoryId: repoId,
        cliName: selectedCli.name,
        cliCommand: selectedCommand,
        ptySessionId: null,
        status: "idle",
        startedAt: Date.now(),
      })

      setActiveSessionId(newSessionId)
      setSpawningSessions((prev) => new Set(prev).add(newSessionId))
    }, 200)
  }, [
    activeSessionId,
    repoId,
    selectedCommand,
    selectedCli,
    createSession,
    updateSessionStatus,
    setActiveSessionId,
  ])

  const handleSessionStart = useCallback(
    (ptySessionId: string) => {
      if (activeSessionId) {
        updateSessionPty(activeSessionId, ptySessionId)
      }
    },
    [activeSessionId, updateSessionPty],
  )

  const handleSessionExit = useCallback(
    (exitCode?: number) => {
      if (activeSessionId) {
        setSpawningSessions((prev) => {
          const next = new Set(prev)
          next.delete(activeSessionId)
          return next
        })
        updateSessionStatus(activeSessionId, "exited", exitCode)
      }
    },
    [activeSessionId, updateSessionStatus],
  )

  // Derive shouldSpawn for the active session
  const shouldSpawn = activeSessionId
    ? spawningSessions.has(activeSessionId)
    : false

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
        onStart={handleStart}
        onStop={handleStop}
        onRestart={handleRestart}
      />

      {/* Main content: Terminal + Git Changes */}
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full min-h-0 w-full"
      >
        {/* Terminal - main area, key forces remount on session switch */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <CliTerminalCard
            key={activeSessionId ?? "no-session"}
            cwd={repoPath}
            command={activeSession?.cliCommand ?? selectedCommand ?? undefined}
            shouldSpawn={shouldSpawn}
            onSessionStart={handleSessionStart}
            onSessionExit={handleSessionExit}
            className="h-full"
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* Git Changes - side panel */}
        <ResizablePanel defaultSize={40} minSize={20}>
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
