import { Send } from "lucide-react";
import type { InputState } from "@/components/jarvis/jarvis-types";
import { inputStateMeta } from "@/components/jarvis/jarvis-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ConversationComposerProps {
  composerValue: string;
  composerRows: number;
  hasRunningExecution: boolean;
  inputState: InputState;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
}

export function ConversationComposer({
  composerValue,
  composerRows,
  hasRunningExecution,
  inputState,
  onComposerChange,
  onSendMessage,
}: ConversationComposerProps) {
  return (
    <div className="glass absolute bottom-4  left-4 right-4 p-2  flex gap-2 pb-4  rounded-xl z-20">
      <Textarea
        value={composerValue}
        onChange={(event) => onComposerChange(event.target.value)}
        rows={composerRows}
        placeholder="Write your message..."
        disabled={hasRunningExecution}
        className="resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        onClick={onSendMessage}
        disabled={hasRunningExecution || !composerValue.trim()}
        className="gap-2"
      >
        <Send className="size-4" />
      </Button>
    </div >
  );
}
