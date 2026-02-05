import {
  AlertTriangle,
  Archive,
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Conversation } from "@/components/main/jarvis-types";
import {
  conversationStatusMeta,
  formatRelativeTime,
} from "@/components/main/jarvis-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SettingsDialog } from "@/components/main/settings-dialog";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: Array<Conversation>;
  activeConversationId: string;
  streamingConversationIds: Set<string>;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onDuplicateConversation: (conversationId: string) => void;
  onExportConversation: (conversationId: string) => void;
  onArchiveConversation: (conversationId: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  streamingConversationIds,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onDuplicateConversation,
  onExportConversation,
  onArchiveConversation,
}: ConversationSidebarProps) {
  // Only show conversations that have messages
  const visibleConversations = useMemo(
    () => conversations.filter((c) => c.items.length > 0),
    [conversations],
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex-none">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-sm font-bold">CHATS</h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onNewConversation}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="border-muted relative flex h-9 items-center border-b">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Search sessions..."
            className="text-muted-foreground border-0 bg-transparent pl-8 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto pb-14">
        <AnimatePresence initial={false}>
          {visibleConversations.map((conversation) => {
            const statusMeta = conversationStatusMeta[conversation.status];
            const isActive = conversation.id === activeConversationId;

            return (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="group relative"
              >
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    "w-full rounded-lg p-2 pr-8 text-left transition-colors",
                    isActive ? "glass-selected" : "glass-hover",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-foreground text-sm font-medium">
                          {conversation.title}
                        </p>
                        {streamingConversationIds.has(conversation.id) ? (
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400" />
                            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                          </span>
                        ) : conversation.status === "running" ? (
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400" />
                            <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
                          </span>
                        ) : conversation.status === "idle" &&
                          conversation.items.length > 0 ? (
                          <span className="size-2 rounded-full bg-emerald-500" />
                        ) : null}
                        {conversation.globalState === "error" ? (
                          <AlertTriangle className="size-3 text-rose-500" />
                        ) : null}
                      </div>
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      {formatRelativeTime(conversation.updatedAt)}
                    </span>
                  </div>
                </button>

                <div className="absolute top-1/2 right-1 -translate-y-1/2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-6 opacity-0 transition-opacity group-hover:opacity-100",
                          "data-[state=open]:opacity-100",
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onRenameConversation(conversation.id)}
                      >
                        <Pencil className="mr-2 size-4" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDuplicateConversation(conversation.id)}
                      >
                        <Copy className="mr-2 size-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onExportConversation(conversation.id)}
                      >
                        <Download className="mr-2 size-4" />
                        Exportar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onArchiveConversation(conversation.id)}
                      >
                        <Archive className="mr-2 size-4" />
                        Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDeleteConversation(conversation.id)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
