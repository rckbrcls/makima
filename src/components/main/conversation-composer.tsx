import { ArrowUp, Folder, Mic, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// Store imports
import {
  useChatActions,
  useComposerRows,
  useComposerValue,
  useHasSelectedModel,
} from "@/stores/chat-store";
import { useHasRunningExecution } from "@/stores/conversation-store";

interface ConversationComposerProps {
  /**
   * Callback when send button is clicked.
   * The component handles composer state internally.
   */
  onSendMessage: () => void;

  /**
   * Callback when new conversation button is clicked.
   */
  onNewConversation: () => void;

  /**
   * Optional model selector component to render.
   * If not provided, ModelSelector will be rendered automatically.
   */
  modelSelector?: ReactNode;
}

/**
 * ConversationComposer - Refactored to use Zustand stores directly.
 *
 * Previously received 9 props:
 * - composerValue, composerRows, hasRunningExecution, inputState,
 * - onComposerChange, onSendMessage, onNewConversation, modelSelector,
 * - isModelSelected
 *
 * Now accesses most state from stores:
 * - composerValue, composerRows from chat-store
 * - hasRunningExecution, inputState from conversation-store
 * - isModelSelected from chat-store
 *
 * Only callbacks remain as props since they depend on parent context.
 */
export function ConversationComposer({
  onSendMessage,
  onNewConversation,
  modelSelector,
}: ConversationComposerProps) {
  // Chat store state
  const composerValue = useComposerValue();
  const composerRows = useComposerRows();
  const isModelSelected = useHasSelectedModel();
  const { setComposerValue } = useChatActions();

  // Conversation store state
  const hasRunningExecution = useHasRunningExecution();

  const isDisabled =
    hasRunningExecution || !composerValue.trim() || !isModelSelected;

  return (
    <div className="bg-card border-border absolute right-4 bottom-4 left-4 z-20 flex flex-col gap-2 rounded-2xl border p-2">
      <Textarea
        value={composerValue}
        onChange={(event) => setComposerValue(event.target.value)}
        rows={composerRows}
        placeholder={
          isModelSelected
            ? "Write your message..."
            : "Select a model to start chatting..."
        }
        disabled={hasRunningExecution || !isModelSelected}
        className="resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onNewConversation}>
            <Plus className="size-4" />
          </Button>

          {modelSelector}

          <Button variant="outline" size="icon">
            <Folder className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Mic className="size-4" />
          </Button>
          <Button
            onClick={onSendMessage}
            disabled={isDisabled}
            className="gap-2 rounded-full"
            size="icon-lg"
          >
            <ArrowUp className="size-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
