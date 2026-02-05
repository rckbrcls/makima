import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderGit2,
  FolderPlus,
  GitBranch,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Repository } from "@/lib/code-types";
import type { Conversation } from "@/components/main/jarvis-types";
import { formatRelativeTime } from "@/components/main/jarvis-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeMenu, createMenuItem } from "@/components/ui/native-menu";
import { cn } from "@/lib/utils";

interface RepositorySidebarProps {
  repositories: Array<Repository>;
  conversations: Array<Conversation>;
  activeRepositoryId: string | null;
  activeConversationId: string | null;
  onSelectRepository: (repoId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onAddRepository: () => void;
  onDeleteRepository: (repoId: string) => void;
  onNewConversation: (repoId: string) => void;
}

export function RepositorySidebar({
  repositories,
  conversations,
  activeRepositoryId,
  activeConversationId,
  onSelectRepository,
  onSelectConversation,
  onAddRepository,
  onDeleteRepository,
  onNewConversation,
}: RepositorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());

  const toggleRepo = useCallback((repoId: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  }, []);

  const handleSelectRepo = useCallback(
    (repoId: string) => {
      onSelectRepository(repoId);
      // Auto-expand when selected
      setExpandedRepos((prev) => new Set(prev).add(repoId));
    },
    [onSelectRepository],
  );

  // Group conversations by repository
  const conversationsByRepo = useMemo(() => {
    const map = new Map<string, Array<Conversation>>();
    for (const conv of conversations) {
      if (conv.repositoryId) {
        const list = map.get(conv.repositoryId) ?? [];
        list.push(conv);
        map.set(conv.repositoryId, list);
      }
    }
    return map;
  }, [conversations]);

  // Filter repositories by search
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repositories;
    const query = searchQuery.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.path.toLowerCase().includes(query),
    );
  }, [repositories, searchQuery]);

  const menuItems = [createMenuItem("remove", "Remove")];

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
      <div className="mt-3 flex-1 overflow-y-auto pb-4 flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {filteredRepos.map((repo) => {
            const isExpanded = expandedRepos.has(repo.id);
            const isActive = repo.id === activeRepositoryId;
            const repoConversations = conversationsByRepo.get(repo.id) ?? [];

            return (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="group"
              >
                {/* Repository row */}
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-xl py-2 px-4 transition-colors ",
                    isActive ? "glass-selected glass" : "glass-hover",
                  )}
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onClick={() => handleSelectRepo(repo.id)}
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-foreground truncate text-sm font-medium">
                        {repo.name}
                      </p>
                      <p className="flex items-center gap-1 text-[10px]">
                        <GitBranch className="size-3" />
                        {repo.branch}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100"
                      onClick={() => onNewConversation(repo.id)}
                    >
                      <MessageSquare className="size-3" />
                    </Button>

                    <NativeMenu
                      items={menuItems}
                      onSelect={(id) => {
                        if (id === "remove") {
                          onDeleteRepository(repo.id);
                        }
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </NativeMenu>
                  </div>
                </div>

                {/* Conversations under this repo */}
                <AnimatePresence initial={false}>
                  {isExpanded && repoConversations.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="ml-4 mt-1 border-l border-zinc-800 pl-2 gap-1 flex flex-col"
                    >
                      {repoConversations.map((conv) => (
                        <button
                          key={conv.id}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors",
                            conv.id === activeConversationId
                              ? "glass glass-selected"
                              : "glass-hover",
                          )}
                          onClick={() => onSelectConversation(conv.id)}
                        >
                          <span className="truncate text-xs">{conv.title}</span>
                          <span className="ml-auto text-[10px]">
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {filteredRepos.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <FolderGit2 className="mb-2 size-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">
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
  );
}
