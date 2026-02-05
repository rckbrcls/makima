import { Settings, X } from "lucide-react";
import type { Conversation } from "@/components/main/jarvis-types";
import { conversationStateMeta } from "@/components/main/jarvis-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConversationHeaderProps {
  activeConversation?: Conversation;
  isConfigOpen: boolean;
  onToggleConfig: () => void;
}

export function ConversationHeader({
  activeConversation,
  isConfigOpen,
  onToggleConfig,
}: ConversationHeaderProps) {
  return (
    <div className="bg-card border-border flex flex-wrap items-start gap-4 border-b px-6 py-4">
      <div className="flex items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {activeConversation?.title ?? "Conversations"}
            </h2>
            {activeConversation ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  conversationStateMeta[activeConversation.state].className,
                )}
              >
                {conversationStateMeta[activeConversation.state].label}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {activeConversation?.summary ?? "Select a conversation to start."}
          </p>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {/* <Badge variant="outline" className="text-[10px]">
          Provider: {provider}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Model: {model}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Tone: {tone}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Safe: {safety.safeMode ? "On" : "Off"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Tools: {toolCount}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Channels: {channelCount}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          Plugins: {pluginCount}
        </Badge> */}

        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", isConfigOpen && "bg-muted")}
          aria-label="Settings"
          onClick={onToggleConfig}
        >
          <Settings className={cn("size-4", isConfigOpen && "hidden")} />
          <X className={cn("size-4", !isConfigOpen && "hidden")} />
        </Button>
      </div>
    </div>
  );
}
