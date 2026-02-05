import { TerminalCard } from "./terminal-card";
import { GitChangesCard } from "./git-changes-card";
import type { Conversation } from "@/components/main/jarvis-types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ConversationThread } from "@/components/main/conversation-thread";
import { ConversationComposer } from "@/components/main/conversation-composer";
import { cn } from "@/lib/utils";

interface CodeWorkspaceProps {
  repoPath?: string;
  conversation?: Conversation;
  onSendMessage: () => void;
  onNewConversation: () => void;
  onViewRun: (runId: string) => void;
  modelSelector: React.ReactNode;
  className?: string;
}

/**
 * CodeWorkspace - Workspace component for code editing with chat.
 *
 * The ConversationComposer now accesses state from Zustand stores internally,
 * so we only pass callbacks and the model selector component.
 */
export function CodeWorkspace({
  repoPath,
  conversation,
  onSendMessage,
  onNewConversation,
  onViewRun,
  modelSelector,
  className,
}: CodeWorkspaceProps) {
  return (
    <div className={cn("relative flex h-full flex-col", className)}>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left side: Chat + Terminal */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <ResizablePanelGroup direction="vertical">
            {/* Chat area */}
            <ResizablePanel defaultSize={60} minSize={20}>
              <div className="relative flex min-h-0 flex-1 flex-col">
                <ConversationThread
                  activeConversation={conversation}
                  onViewRun={onViewRun}
                />
                <ConversationComposer
                  onSendMessage={onSendMessage}
                  onNewConversation={onNewConversation}
                  modelSelector={modelSelector}
                />
              </div>
            </ResizablePanel>

            {/* Terminal */}
            <ResizablePanel defaultSize={40} minSize={15}>
              <TerminalCard cwd={repoPath} className="h-full" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right side: Git Changes */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <GitChangesCard
            repoPath={repoPath}
            className="h-full border-l border-zinc-800"
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
