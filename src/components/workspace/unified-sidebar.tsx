import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  FolderGit2,
  Plus,
  ChevronRight,
  Cpu,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  GitBranch,
  Trash2,
  FolderOpen,
  Copy,
  RotateCcw,
  Terminal,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Session, Agent } from "@/components/agents/types"
import type { Repository } from "@/components/repos/types"

// ============================================================================
// Types
// ============================================================================

interface UnifiedSidebarProps {
  repositories: Repository[]
  sessions: Session[]
  agents: Agent[]
  selectedRepo: string | null
  selectedSession: Session | null
  isCreatingNewSession: boolean
  runningCounts: Record<string, number>
  onSelectRepo: (repo: string | null) => void
  onSelectSession: (session: Session | null) => void
  onNewSession: (repoName: string) => void
  onDeleteRepository: (repo: string) => void
  getPendingCount: (sessionId: string) => number
}

// ============================================================================
// Session Item
// ============================================================================

interface SessionItemProps {
  session: Session
  agent: Agent | undefined
  isSelected: boolean
  onClick: () => void
  pendingCount: number
}

function SessionItem({ session, agent, isSelected, onClick, pendingCount }: SessionItemProps) {
  const stateConfig = {
    active: { icon: Loader2, color: "text-blue-500", animate: true },
    done: { icon: CheckCircle2, color: "text-green-500", animate: false },
    failed: { icon: XCircle, color: "text-red-500", animate: false },
  }

  const config = stateConfig[session.state]
  const StateIcon = config.icon

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md transition-all text-sm",
            "hover:bg-muted",
            isSelected && "bg-primary/10 text-primary"
          )}
        >
          <div className="flex items-center gap-2">
            <StateIcon
              className={cn(
                "size-3.5 shrink-0",
                config.color,
                config.animate && "animate-spin"
              )}
            />
            <span className="flex-1 truncate">{session.goal}</span>
            {pendingCount > 0 && (
              <Badge className="text-[9px] h-4 px-1 bg-yellow-500/20 text-yellow-600">
                {pendingCount}
              </Badge>
            )}
          </div>
          {agent && (
            <div className="flex items-center gap-1 mt-0.5 ml-5 text-xs text-muted-foreground">
              <Cpu className="size-2.5" />
              <span>{agent.name}</span>
              <span className="mx-1">·</span>
              <span>{new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onClick}>
          <FolderOpen className="size-4" />
          Open Session
        </ContextMenuItem>
        <ContextMenuItem>
          <Copy className="size-4" />
          Copy Goal
        </ContextMenuItem>
        {session.state === "active" && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <RotateCcw className="size-4" />
              Restart Session
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">
          <Trash2 className="size-4" />
          Delete Session
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ============================================================================
// Repository Group
// ============================================================================

interface RepoGroupProps {
  repo: Repository
  sessions: Session[]
  agents: Agent[]
  isExpanded: boolean
  isSelected: boolean
  selectedSession: Session | null
  isCreatingNewSession: boolean
  runningCount: number
  onToggle: () => void
  onSelectSession: (session: Session | null) => void
  onNewSession: () => void
  onDelete: () => void
  getPendingCount: (sessionId: string) => number
}

function RepoGroup({
  repo,
  sessions,
  agents,
  isExpanded,
  isSelected,
  selectedSession,
  isCreatingNewSession,
  runningCount,
  onToggle,
  onSelectSession,
  onNewSession,
  onDelete,
  getPendingCount,
}: RepoGroupProps) {
  const activeSessions = sessions.filter((s) => s.state === "active")
  const historySessions = sessions.filter((s) => s.state !== "active")
  const totalActive = activeSessions.length

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn(
          "rounded-lg transition-all",
          isSelected && "bg-muted"
        )}
      >
        {/* Repo Header with Context Menu */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 text-left rounded-lg transition-all",
                  "hover:bg-muted",
                  isExpanded && "bg-muted"
                )}
              >
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
                <FolderGit2 className="size-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{repo.name}</span>
                </div>
                {totalActive > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {totalActive}
                  </Badge>
                )}
                {runningCount > 0 && (
                  <Badge className="text-[10px] h-5 bg-green-500/20 text-green-600 border-green-500/30">
                    {runningCount}
                  </Badge>
                )}
              </button>
            </CollapsibleTrigger>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={onNewSession}>
              <MessageSquarePlus className="size-4" />
              New Session
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <ExternalLink className="size-4" />
              Open in Finder
            </ContextMenuItem>
            <ContextMenuItem>
              <Terminal className="size-4" />
              Open Terminal
            </ContextMenuItem>
            <ContextMenuItem>
              <GitBranch className="size-4" />
              Switch Branch
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Remove Repository
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="pl-4 pr-2 pb-2 space-y-1">
            {/* Repo Info */}
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
              <GitBranch className="size-3" />
              <span>{repo.branch}</span>
            </div>

            {/* New Session Button */}
            <button
              onClick={onNewSession}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm",
                "hover:bg-primary/10 text-primary",
                isCreatingNewSession && isSelected && "bg-primary/10"
              )}
            >
              <MessageSquarePlus className="size-3.5" />
              <span>New Session</span>
            </button>

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">
                  Active
                </p>
                {activeSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    agent={agents.find((a) => a.id === session.agentId)}
                    isSelected={selectedSession?.id === session.id && !isCreatingNewSession}
                    onClick={() => onSelectSession(session)}
                    pendingCount={getPendingCount(session.id)}
                  />
                ))}
              </div>
            )}

            {/* History Sessions */}
            {historySessions.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">
                  History
                </p>
                {historySessions.slice(0, 5).map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    agent={agents.find((a) => a.id === session.agentId)}
                    isSelected={selectedSession?.id === session.id && !isCreatingNewSession}
                    onClick={() => onSelectSession(session)}
                    pendingCount={getPendingCount(session.id)}
                  />
                ))}
                {historySessions.length > 5 && (
                  <p className="text-xs text-muted-foreground px-3 py-1">
                    +{historySessions.length - 5} more
                  </p>
                )}
              </div>
            )}

            {/* Empty State */}
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">
                No sessions yet
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function UnifiedSidebar({
  repositories,
  sessions,
  agents,
  selectedRepo,
  selectedSession,
  isCreatingNewSession,
  runningCounts,
  onSelectRepo,
  onSelectSession,
  onNewSession,
  onDeleteRepository,
  getPendingCount,
}: UnifiedSidebarProps) {
  // Track which repos are expanded
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(() => {
    if (selectedRepo) return new Set([selectedRepo])
    return new Set()
  })

  const toggleRepo = (repoName: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev)
      if (next.has(repoName)) {
        next.delete(repoName)
      } else {
        next.add(repoName)
      }
      return next
    })
    onSelectRepo(repoName)
  }

  const handleNewSession = (repoName: string) => {
    setExpandedRepos((prev) => new Set(prev).add(repoName))
    onSelectRepo(repoName)
    onNewSession(repoName)
  }

  const handleSelectSession = (session: Session | null) => {
    if (!session) {
      onSelectSession(null)
      return
    }
    setExpandedRepos((prev) => new Set(prev).add(session.repoName))
    onSelectRepo(session.repoName)
    onSelectSession(session)
  }

  // Group sessions by repo
  const sessionsByRepo = sessions.reduce((acc, session) => {
    if (!acc[session.repoName]) {
      acc[session.repoName] = []
    }
    acc[session.repoName].push(session)
    return acc
  }, {} as Record<string, Session[]>)

  return (
    <div className="h-full flex flex-col overflow-hidden border-r border-border bg-card">
      {/* Header */}
      <div className="flex-none p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Workspace</h2>
          <Button variant="ghost" size="icon" className="size-7">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Repository List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {repositories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <FolderGit2 className="size-10 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No repositories</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Add a repository to get started
            </p>
          </div>
        ) : (
          repositories.map((repo) => (
            <RepoGroup
              key={repo.name}
              repo={repo}
              sessions={sessionsByRepo[repo.name] ?? []}
              agents={agents}
              isExpanded={expandedRepos.has(repo.name)}
              isSelected={selectedRepo === repo.name}
              selectedSession={selectedSession}
              isCreatingNewSession={isCreatingNewSession && selectedRepo === repo.name}
              runningCount={runningCounts[repo.name] ?? 0}
              onToggle={() => toggleRepo(repo.name)}
              onSelectSession={handleSelectSession}
              onNewSession={() => handleNewSession(repo.name)}
              onDelete={() => onDeleteRepository(repo.name)}
              getPendingCount={getPendingCount}
            />
          ))
        )}
      </div>
    </div>
  )
}
