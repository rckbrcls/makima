import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FolderGit2,
  FolderPlus,
  GitBranch,
  Plus,
  Search,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { invoke } from "@tauri-apps/api/core"
import type { CliSession, Repository } from "@/lib/code-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  NativeContextMenu,
  createMenuItem,
  createSeparator,
} from "@/components/ui/native-context-menu"
import { cn } from "@/lib/utils"

interface RepositorySidebarProps {
  repositories: Array<Repository>
  activeRepositoryId: string | null
  activeSessionId: string | null
  onSelectRepository: (repoId: string) => void
  onSelectSession: (sessionId: string) => void
  onAddRepository: () => void
  onDeleteRepository: (repoId: string) => void
  onRenameRepository: (repoId: string, newName: string) => void
  onNewSession: (repoId: string) => void
  onStopSession: (sessionId: string) => void
  onRestartSession: (sessionId: string) => void
  onRemoveSession: (sessionId: string) => void
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
  onRenameRepository,
  onNewSession,
  onStopSession,
  onRestartSession,
  onRemoveSession,
  sessions,
}: RepositorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Focus the rename input when editing starts
  useEffect(() => {
    if (editingRepoId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [editingRepoId])

  const commitRename = useCallback(() => {
    if (editingRepoId && editingName.trim()) {
      onRenameRepository(editingRepoId, editingName.trim())
    }
    setEditingRepoId(null)
    setEditingName("")
  }, [editingRepoId, editingName, onRenameRepository])

  const cancelRename = useCallback(() => {
    setEditingRepoId(null)
    setEditingName("")
  }, [])

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

  const repoMenuItems = [
    createMenuItem("rename", "Rename"),
    createMenuItem("open-finder", "Open in Finder"),
    createMenuItem("copy-path", "Copy Path"),
    createSeparator(),
    createMenuItem("remove", "Remove"),
  ]

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
            const isEditing = editingRepoId === repo.id

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
                <NativeContextMenu
                  items={repoMenuItems}
                  onSelect={(id) => {
                    if (id === "rename") {
                      setEditingRepoId(repo.id)
                      setEditingName(repo.name)
                    }
                    if (id === "open-finder") {
                      invoke("reveal_in_finder", { path: repo.path })
                    }
                    if (id === "copy-path") {
                      navigator.clipboard.writeText(repo.path)
                    }
                    if (id === "remove") {
                      onDeleteRepository(repo.id)
                    }
                  }}
                >
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-4 py-2 transition-colors",
                      isActive ? "glass-selected glass" : "glass-hover",
                    )}
                    onClick={() => onSelectRepository(repo.id)}
                  >
                    <div className="min-w-0 flex-1 text-left">
                      {isEditing ? (
                        <Input
                          ref={renameInputRef}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename()
                            if (e.key === "Escape") cancelRename()
                            e.stopPropagation()
                          }}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 border-0 bg-transparent px-0 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      ) : (
                        <p className="text-foreground truncate text-sm font-medium">
                          {repo.name}
                        </p>
                      )}
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
                    {isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onNewSession(repo.id)
                        }}
                        className="text-muted-foreground hover:text-foreground flex-none rounded-md p-0.5 transition-colors"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </button>
                </NativeContextMenu>

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
                          const isRunning = session.status === "running"
                          const statusColor = isRunning
                            ? "bg-emerald-400"
                            : session.status === "error"
                              ? "bg-red-400"
                              : "bg-muted-foreground"

                          const sessionMenuItems = [
                            createMenuItem("stop", "Stop Session", {
                              enabled: isRunning,
                            }),
                            createMenuItem("restart", "Restart Session"),
                            createSeparator(),
                            createMenuItem("remove", "Remove Session"),
                          ]

                          return (
                            <NativeContextMenu
                              key={session.id}
                              items={sessionMenuItems}
                              onSelect={(id) => {
                                if (id === "stop") onStopSession(session.id)
                                if (id === "restart") onRestartSession(session.id)
                                if (id === "remove") onRemoveSession(session.id)
                              }}
                            >
                              <button
                                onClick={() => onSelectSession(session.id)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors",
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
                            </NativeContextMenu>
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
