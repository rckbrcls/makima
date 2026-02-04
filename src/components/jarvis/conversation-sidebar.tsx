import { AlertTriangle, Plus, Search } from "lucide-react";
import type { Conversation } from "@/components/jarvis/jarvis-types";
import { conversationStatusMeta, formatRelativeTime, getConversationPreview } from "@/components/jarvis/jarvis-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: Array<Conversation>;
  activeConversationId: string;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
}: ConversationSidebarProps) {
  return (
    <>
      <div className="flex-none">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold font-serif">CHATS</h2>
          <Button variant="ghost" size="icon" className="size-7">
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

      <div className="flex-1 mt-3 space-y-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const statusMeta = conversationStatusMeta[conversation.status];
          const isActive = conversation.id === activeConversationId;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                "w-full rounded-lg p-2 text-left transition-colors",
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
                    {conversation.globalState === "error" ? (
                      <AlertTriangle className="size-3 text-rose-500" />
                    ) : null}
                  </div>
                </div>
                <span className="text-muted-foreground text-[10px]">
                  {formatRelativeTime(conversation.updatedAt)}
                </span>
              </div>
              {/* <div className="text-muted-foreground mt-2 text-xs">
                {getConversationPreview(conversation)}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", statusMeta.className)}
                >
                  {statusMeta.label}
                </Badge>
              </div> */}
            </button>
          );
        })}
      </div>
    </>
  );
}
