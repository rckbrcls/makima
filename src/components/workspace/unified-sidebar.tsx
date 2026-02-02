import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  ExternalLink,
  FolderGit2,
  FolderOpen,
  GitBranch,
  Loader2,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  Search,
  Terminal,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Agent, Session } from "@/components/agents/types";
import type { Repository } from "@/components/repos/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface UnifiedSidebarProps {
  repositories: Array<Repository>;
  sessions: Array<Session>;
  agents: Array<Agent>;
  selectedRepo: string | null;
  selectedSession: Session | null;
  isCreatingNewSession: boolean;
  runningCounts: Record<string, number>;
  onSelectRepo: (repo: string | null) => void;
  onSelectSession: (session: Session | null) => void;
  onNewSession: (repoName: string) => void;
  onDeleteRepository: (repo: string) => void;
  getPendingCount: (sessionId: string) => number;
}

// ============================================================================
// Session Item
// ============================================================================

interface SessionItemProps {
  session: Session;
  agent: Agent | undefined;
  isSelected: boolean;
  onClick: () => void;
  pendingCount: number;
}

function SessionItem({
  session,
  agent,
  isSelected,
  onClick,
  pendingCount,
}: SessionItemProps) {
  const stateConfig = {
    active: { icon: Loader2, color: "text-blue-500", animate: true },
    done: { icon: CheckCircle2, color: "text-green-500", animate: false },
    failed: { icon: XCircle, color: "text-red-500", animate: false },
  };

  const config = stateConfig[session.state];
  const StateIcon = config.icon;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-full rounded-md px-3 py-2 text-left text-sm transition-all",
            "hover:bg-muted",
            isSelected && "bg-accent text-primary",
          )}
        >
          <div className="flex items-center gap-2">
            <StateIcon
              className={cn(
                "size-3.5 shrink-0",
                config.color,
                config.animate && "animate-spin",
              )}
            />
            <span className="flex-1 truncate">{session.goal}</span>
            {pendingCount > 0 && (
              <Badge className="h-4 bg-yellow-100 px-1 text-[9px] text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                {pendingCount}
              </Badge>
            )}
          </div>
          {agent && (
            <div className="text-muted-foreground mt-0.5 ml-5 flex items-center gap-1 text-xs">
              <Cpu className="size-2.5" />
              <span>{agent.name}</span>
              <span className="mx-1">·</span>
              <span>
                {new Date(session.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
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
  );
}

// ============================================================================
// Repository Group
// ============================================================================

interface RepoGroupProps {
  repo: Repository;
  sessions: Array<Session>;
  agents: Array<Agent>;
  isExpanded: boolean;
  isSelected: boolean;
  selectedSession: Session | null;
  isCreatingNewSession: boolean;
  runningCount: number;
  onToggle: () => void;
  onSelectSession: (session: Session | null) => void;
  onNewSession: () => void;
  onDelete: () => void;
  getPendingCount: (sessionId: string) => number;
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
  const activeSessions = sessions.filter((s) => s.state === "active");
  const historySessions = sessions.filter((s) => s.state !== "active");
  const totalActive = activeSessions.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn("rounded-lg transition-all", isSelected && "bg-muted")}
      >
        {/* Repo Header with Context Menu */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all",
                  "hover:bg-muted",
                  isExpanded && "bg-muted",
                )}
              >
                <ChevronRight
                  className={cn(
                    "text-muted-foreground size-4 transition-transform",
                    isExpanded && "rotate-90",
                  )}
                />
                <FolderGit2 className="text-primary size-4" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{repo.name}</span>
                </div>
                {totalActive > 0 && (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {totalActive}
                  </Badge>
                )}
                {runningCount > 0 && (
                  <Badge className="h-5 border-green-500 bg-green-100 text-[10px] text-green-700 dark:bg-green-900 dark:text-green-300">
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
          <div className="space-y-1 pr-2 pb-2 pl-4">
            {/* Repo Info */}
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-1 text-xs">
              <GitBranch className="size-3" />
              <span>{repo.branch}</span>
            </div>

            {/* New Session Button */}
            <button
              onClick={onNewSession}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-all",
                "hover:bg-accent text-primary",
                isCreatingNewSession && isSelected && "bg-accent",
              )}
            >
              <MessageSquarePlus className="size-3.5" />
              <span>New Session</span>
            </button>

            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div className="pt-1">
                <p className="text-muted-foreground px-3 py-1 text-[10px] font-medium tracking-wider uppercase">
                  Active
                </p>
                {activeSessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    agent={agents.find((a) => a.id === session.agentId)}
                    isSelected={
                      selectedSession?.id === session.id &&
                      !isCreatingNewSession
                    }
                    onClick={() => onSelectSession(session)}
                    pendingCount={getPendingCount(session.id)}
                  />
                ))}
              </div>
            )}

            {/* History Sessions */}
            {historySessions.length > 0 && (
              <div className="pt-1">
                <p className="text-muted-foreground px-3 py-1 text-[10px] font-medium tracking-wider uppercase">
                  History
                </p>
                {historySessions.slice(0, 5).map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    agent={agents.find((a) => a.id === session.agentId)}
                    isSelected={
                      selectedSession?.id === session.id &&
                      !isCreatingNewSession
                    }
                    onClick={() => onSelectSession(session)}
                    pendingCount={getPendingCount(session.id)}
                  />
                ))}
                {historySessions.length > 5 && (
                  <p className="text-muted-foreground px-3 py-1 text-xs">
                    +{historySessions.length - 5} more
                  </p>
                )}
              </div>
            )}

            {/* Empty State */}
            {sessions.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-xs">
                No sessions yet
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  // Track which repos are expanded
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(() => {
    if (selectedRepo) return new Set([selectedRepo]);
    return new Set();
  });

  const filteredSessions = sessions.filter((session) =>
    session.goal.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleRepo = (repoName: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoName)) {
        next.delete(repoName);
      } else {
        next.add(repoName);
      }
      return next;
    });
    onSelectRepo(repoName);
  };

  const handleNewSession = (repoName: string) => {
    setExpandedRepos((prev) => new Set(prev).add(repoName));
    onSelectRepo(repoName);
    onNewSession(repoName);
  };

  const handleSelectSession = (session: Session | null) => {
    if (!session) {
      onSelectSession(null);
      return;
    }
    setExpandedRepos((prev) => new Set(prev).add(session.repoName));
    onSelectRepo(session.repoName);
    onSelectSession(session);
  };

  // Group sessions by repo
  const sessionsByRepo = filteredSessions.reduce(
    (acc, session) => {
      if (!acc[session.repoName]) {
        acc[session.repoName] = [];
      }
      acc[session.repoName].push(session);
      return acc;
    },
    {} as Record<string, Array<Session>>,
  );

  return (
    <div className="border-border bg-card flex h-full flex-col overflow-hidden border-r">
      {/* Header */}
      <div className="border-border flex-none border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Workspace</h2>
          <Button variant="ghost" size="icon" className="size-7">
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Search sessions..."
            className="border-border bg-background h-9 rounded-lg pl-8 text-xs"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      {/* Repository List */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {repositories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <FolderGit2 className="text-muted mb-2 size-10" />
            <p className="text-muted-foreground text-sm">No repositories</p>
            <p className="text-muted-foreground mt-1 text-xs">
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
              isCreatingNewSession={
                isCreatingNewSession && selectedRepo === repo.name
              }
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
  );
}
