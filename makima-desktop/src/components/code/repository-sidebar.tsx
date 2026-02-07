import { useCallback, useMemo, useState } from "react"
import {
  FolderGit2,
  FolderPlus,
  GitBranch,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { CliSession, Repository } from "@/lib/code-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeMenu, createMenuItem } from "@/components/ui/native-menu"
import { cn } from "@/lib/utils"

interface RepositorySidebarProps {
  repositories: Array<Repository>
  activeRepositoryId: string | null
  activeSessionId: string | null
  onSelectRepository: (repoId: string) => void
  onSelectSession: (sessionId: string) => void
  onAddRepository: () => void
  onDeleteRepository: (repoId: string) => void
  sessions: Map<string, CliSession>
}

export function RepositorySidebar({
  repositories,
  activeRepositoryId,
  activeSessionId,
  onSelectRepository,
  onSelectSession,
  onAddRepository,
  onDeleteRepository,
  sessions,
}: RepositorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter repositories by search
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repositories
    const query = searchQuery.toLowerCase()
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.path.toLowerCase().includes(query),
    )
  }, [repositories, searchQuery])

  // Group sessions by repositoryId
  const sessionsByRepo = useMemo(() => {
    const map = new Map<string, Array<CliSession>>()
    for (const session of sessions.values()) {
      const list = map.get(session.repositoryId) ?? []
      list.push(session)
      map.set(session.repositoryId, list)
    }
    // Sort each group by startedAt descending (newest first)
    for (const list of map.values()) {
      list.sort((a, b) => b.startedAt - a.startedAt)
    }
    return map
  }, [sessions])

  const menuItems = [createMenuItem("remove", "Remove")]

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="flex-none">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-sm font-bold">REPOSITORIES</h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onAddRepository}
          >
            <FolderPlus className="size-4" />
          </Button>
        </div>
        <div className="border-muted relative flex h-9 items-center border-b">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-muted-foreground border-0 bg-transparent pl-8 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Repository list */}
      <div className="mt-3 flex flex-1 flex-col gap-1 overflow-y-auto pb-4">
        <AnimatePresence initial={false}>
          {filteredRepos.map((repo) => {
            const isActive = repo.id === activeRepositoryId
            const repoSessions = sessionsByRepo.get(repo.id) ?? []

            return (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="group/repo"
              >
                {/* Repository row */}
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-xl px-4 py-2 transition-colors",
                    isActive ? "glass-selected glass" : "glass-hover",
                  )}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onClick={() => onSelectRepository(repo.id)}
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-foreground truncate text-sm font-medium">
                        {repo.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="flex items-center gap-1 text-[10px]">
                          <GitBranch className="size-3" />
                          {repo.branch}
                        </p>
                        {repoSessions.length > 0 && (
                          <span className="text-muted-foreground text-[10px]">
                            {repoSessions.filter((s) => s.status === "running").length > 0
                              ? `${repoSessions.filter((s) => s.status === "running").length} running`
                              : `${repoSessions.length} session${repoSessions.length > 1 ? "s" : ""}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <NativeMenu
                      items={menuItems}
                      onSelect={(id) => {
                        if (id === "remove") {
                          onDeleteRepository(repo.id)
                        }
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 group-hover/repo:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </NativeMenu>
                  </div>
                </div>

                {/* Session sub-items (expanded when repo is active) */}
                <AnimatePresence initial={false}>
                  {isActive && repoSessions.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 flex flex-col gap-0.5 py-1">
                        {repoSessions.map((session) => {
                          const isSelected = session.id === activeSessionId
                          const statusColor =
                            session.status === "running"
                              ? "bg-emerald-400"
                              : session.status === "error"
                                ? "bg-red-400"
                                : "bg-muted-foreground"

                          return (
                            <button
                              key={session.id}
                              onClick={() => onSelectSession(session.id)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors",
                                isSelected
                                  ? "glass glass-selected"
                                  : "glass-hover",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 flex-none rounded-full",
                                  statusColor,
                                )}
                              />
                              <span className="text-foreground min-w-0 truncate text-xs font-medium">
                                {session.cliName}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {session.status}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Empty state */}
        {filteredRepos.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <FolderGit2 className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "No repositories found" : "No repositories yet"}
            </p>
            {!searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={onAddRepository}
              >
                <Plus className="mr-1 size-3" />
                Add Repository
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
