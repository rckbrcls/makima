import type { ReactNode } from "react";
import { ArrowUp, Folder, Mic, Plus } from "lucide-react";
import type { InputState } from "@/components/main/jarvis-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ConversationComposerProps {
  composerValue: string;
  composerRows: number;
  hasRunningExecution: boolean;
  inputState: InputState;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  onNewConversation: () => void;
  modelSelector?: ReactNode;
  isModelSelected: boolean;
}

export function ConversationComposer({
  composerValue,
  composerRows,
  hasRunningExecution,
  onComposerChange,
  onSendMessage,
  onNewConversation,
  modelSelector,
  isModelSelected,
}: ConversationComposerProps) {
  return (
    <div className="bg-card border border-border absolute bottom-4 left-4 right-4  flex flex-col gap-2 p-2  rounded-2xl z-20">
      <Textarea
        value={composerValue}
        onChange={(event) => onComposerChange(event.target.value)}
        rows={composerRows}
        placeholder={isModelSelected ? "Write your message..." : "Select a model to start chatting..."}
        disabled={hasRunningExecution || !isModelSelected}
        className="resize-none bg-transparent  border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <div className="flex justify-between items-end">
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="icon" onClick={onNewConversation}>
            <Plus className="size-4" />
          </Button>

          {modelSelector}

          <Button variant="outline" size="icon">
            <Folder className="size-4" />
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <Button variant="outline" size="icon">
            <Mic className="size-4" />
          </Button>
          <Button
            onClick={onSendMessage}
            disabled={hasRunningExecution || !composerValue.trim() || !isModelSelected}
            className="gap-2 rounded-full"
            size="icon-lg"
          >
            <ArrowUp className="size-6 " />
          </Button>
        </div>
      </div>
    </div >
  );
}
