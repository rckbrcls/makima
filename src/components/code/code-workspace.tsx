import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { TerminalCard } from './terminal-card'
import { GitChangesCard } from './git-changes-card'
import { ConversationThread } from '@/components/main/conversation-thread'
import { ConversationComposer } from '@/components/main/conversation-composer'
import type { Conversation } from '@/components/main/jarvis-types'
import { cn } from '@/lib/utils'

interface CodeWorkspaceProps {
  repoPath?: string
  conversation?: Conversation
  composerValue: string
  composerRows: number
  hasRunningExecution: boolean
  inputState: 'idle' | 'thinking' | 'executing'
  isModelSelected: boolean
  onComposerChange: (value: string) => void
  onSendMessage: () => void
  onNewConversation: () => void
  onViewRun: (runId: string) => void
  modelSelector: React.ReactNode
  className?: string
}

export function CodeWorkspace({
  repoPath,
  conversation,
  composerValue,
  composerRows,
  hasRunningExecution,
  inputState,
  isModelSelected,
  onComposerChange,
  onSendMessage,
  onNewConversation,
  onViewRun,
  modelSelector,
  className,
}: CodeWorkspaceProps) {
  return (
    <div className={cn('flex h-full flex-col relative', className)}>
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
                  composerValue={composerValue}
                  composerRows={composerRows}
                  hasRunningExecution={hasRunningExecution}
                  inputState={inputState}
                  onComposerChange={onComposerChange}
                  onSendMessage={onSendMessage}
                  onNewConversation={onNewConversation}
                  isModelSelected={isModelSelected}
                  modelSelector={modelSelector}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Terminal */}
            <ResizablePanel defaultSize={40} minSize={15}>
              <TerminalCard cwd={repoPath} className="h-full" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right side: Git Changes */}
        <ResizablePanel defaultSize={45} minSize={25}>
          <GitChangesCard repoPath={repoPath} className="h-full border-l border-zinc-800" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
