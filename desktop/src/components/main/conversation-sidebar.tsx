import { AlertTriangle, MoreHorizontal, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback } from "react";
import type { Conversation } from "@/components/main/jarvis-types";
import { formatRelativeTime } from "@/components/main/jarvis-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeMenu,
  createMenuItem,
  createSeparator,
} from "@/components/ui/native-menu";
import { cn } from "@/lib/utils";
// Store imports
import {
  useActiveConversationId,
  useConversationActions,
  useStreamingConversationIds,
  useVisibleConversations,
} from "@/stores/conversation-store";

interface ConversationSidebarProps {
  /**
   * List of conversations to display.
   * If provided, uses these instead of the shared store.
   */
  conversations?: Array<Conversation>;

  /**
   * Active conversation ID.
   * If provided, uses this instead of the shared store.
   */
  activeConversationId?: string | null;

  /**
   * Callback when a conversation is selected.
   * Optional - if not provided, will use store action directly.
   */
  onSelectConversation?: (conversationId: string) => void;

  /**
   * Callback for creating a new conversation.
   */
  onNewConversation: () => void;

  /**
   * Callback for renaming a conversation.
   */
  onRenameConversation?: (conversationId: string) => void;

  /**
   * Callback for deleting a conversation.
   */
  onDeleteConversation?: (conversationId: string) => void;

  /**
   * Callback for duplicating a conversation.
   */
  onDuplicateConversation?: (conversationId: string) => void;

  /**
   * Callback for exporting a conversation.
   */
  onExportConversation?: (conversationId: string) => void;

  /**
   * Callback for archiving a conversation.
   */
  onArchiveConversation?: (conversationId: string) => void;
}

/**
 * ConversationSidebar - Refactored to use Zustand stores directly.
 *
 * Previously received 10 props:
 * - conversations, activeConversationId, streamingConversationIds,
 * - onSelectConversation, onNewConversation, onRenameConversation,
 * - onDeleteConversation, onDuplicateConversation, onExportConversation,
 * - onArchiveConversation
 *
 * Now accesses state from stores:
 * - conversations from conversation-store (useVisibleConversations)
 * - activeConversationId from conversation-store
 * - streamingConversationIds from conversation-store
 *
 * Callbacks remain as props for flexibility, but have default implementations.
 */
export function ConversationSidebar({
  conversations: conversationsProp,
  activeConversationId: activeConversationIdProp,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onDuplicateConversation,
  onExportConversation,
  onArchiveConversation,
}: ConversationSidebarProps) {
  // Store state (used as fallback when props are not provided)
  const storeConversations = useVisibleConversations();
  const storeActiveConversationId = useActiveConversationId();
  const streamingConversationIds = useStreamingConversationIds();
  const { setActiveConversationId, removeConversation, addConversation } =
    useConversationActions();

  // Use props if provided, otherwise fall back to store
  const visibleConversations =
    conversationsProp?.filter((c) => c.items.length > 0) ?? storeConversations;
  const activeConversationId = activeConversationIdProp ?? storeActiveConversationId;

  // Default handlers using store actions
  const handleSelectConversation = useCallback(
    (id: string) => {
      if (onSelectConversation) {
        onSelectConversation(id);
      } else {
        setActiveConversationId(id);
      }
    },
    [onSelectConversation, setActiveConversationId],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      if (onDeleteConversation) {
        onDeleteConversation(id);
      } else {
        removeConversation(id);
      }
    },
    [onDeleteConversation, removeConversation],
  );

  const handleDuplicateConversation = useCallback(
    (id: string) => {
      if (onDuplicateConversation) {
        onDuplicateConversation(id);
        return;
      }

      // Default implementation using store
      const original = visibleConversations.find((c) => c.id === id);
      if (original) {
        const duplicate: Conversation = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addConversation(duplicate);
      }
    },
    [onDuplicateConversation, visibleConversations, addConversation],
  );

  const handleExportConversation = useCallback(
    (id: string) => {
      if (onExportConversation) {
        onExportConversation(id);
        return;
      }

      // Default implementation
      const conversation = visibleConversations.find((c) => c.id === id);
      if (conversation) {
        const data = JSON.stringify(conversation, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${conversation.title.replace(/[^a-z0-9]/gi, "_")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [onExportConversation, visibleConversations],
  );

  const handleRenameConversation = useCallback(
    (id: string) => {
      if (onRenameConversation) {
        onRenameConversation(id);
      }
      // TODO: implement default rename UI
    },
    [onRenameConversation],
  );

  const handleArchiveConversation = useCallback(
    (id: string) => {
      if (onArchiveConversation) {
        onArchiveConversation(id);
      }
      // TODO: implement default archive
    },
    [onArchiveConversation],
  );

  const menuItems = [
    createMenuItem("rename", "Rename"),
    createMenuItem("duplicate", "Duplicate"),
    createMenuItem("export", "Export"),
    createSeparator(),
    createMenuItem("archive", "Archive"),
    createMenuItem("delete", "Delete"),
  ];

  const handleMenuSelect = useCallback(
    (conversationId: string) => (actionId: string) => {
      switch (actionId) {
        case "rename":
          handleRenameConversation(conversationId);
          break;
        case "duplicate":
          handleDuplicateConversation(conversationId);
          break;
        case "export":
          handleExportConversation(conversationId);
          break;
        case "archive":
          handleArchiveConversation(conversationId);
          break;
        case "delete":
          handleDeleteConversation(conversationId);
          break;
      }
    },
    [
      handleRenameConversation,
      handleDuplicateConversation,
      handleExportConversation,
      handleArchiveConversation,
      handleDeleteConversation,
    ],
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
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={cn(
                    "w-full rounded-lg p-2 pr-8 text-left transition-colors",
                    isActive ? "glass-selected glass" : "glass-hover",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-foreground text-sm font-medium">
                          {conversation.title}
                        </p>
                        {streamingConversationIds.includes(conversation.id) ? (
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
                  <NativeMenu
                    items={menuItems}
                    onSelect={handleMenuSelect(conversation.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "size-6 opacity-0 transition-opacity group-hover:opacity-100",
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </NativeMenu>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
