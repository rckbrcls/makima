import { AlertTriangle, Archive, Copy, Download, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import type { Conversation } from "@/components/main/jarvis-types";
import { conversationStatusMeta, formatRelativeTime } from "@/components/main/jarvis-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: Array<Conversation>;
  activeConversationId: string;
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
    <>
      <div className="flex-none">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold font-serif">CHATS</h2>
          <Button variant="ghost" size="icon" className="size-7" onClick={onNewConversation}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="relative border-b border-muted flex items-center h-9 ">
          <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Search sessions..."
            className="pl-8 text-xs bg-transparent text-muted-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex-1 mt-3 overflow-y-auto">
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
                    isActive
                      ? "glass-selected"
                      : "glass-hover",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-foreground text-sm font-medium">
                          {conversation.title}
                        </p>
                        {conversation.status === "running" ? (
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400" />
                            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                          </span>
                        ) : conversation.status === "idle" && conversation.items.length > 0 ? (
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

                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-6 opacity-0 group-hover:opacity-100 transition-opacity",
                          "data-[state=open]:opacity-100"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onRenameConversation(conversation.id)}>
                        <Pencil className="size-4 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicateConversation(conversation.id)}>
                        <Copy className="size-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExportConversation(conversation.id)}>
                        <Download className="size-4 mr-2" />
                        Exportar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onArchiveConversation(conversation.id)}>
                        <Archive className="size-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDeleteConversation(conversation.id)}
                      >
                        <Trash2 className="size-4 mr-2" />
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
    </>
  );
}
