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
    <div className="border-border bg-card border-t px-6 py-4">
      <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              inputStateMeta[inputState].className,
            )}
          />
          <span>State: {inputStateMeta[inputState].label}</span>
        </div>
        <span>{hasRunningExecution ? "Input blocked during execution" : ""}</span>
      </div>
      <div className="flex items-end gap-3">
        <Textarea
          value={composerValue}
          onChange={(event) => onComposerChange(event.target.value)}
          rows={composerRows}
          placeholder="Write your message (without openClaw memory)..."
          disabled={hasRunningExecution}
          className="resize-none"
        />
        <Button
          onClick={onSendMessage}
          disabled={hasRunningExecution || !composerValue.trim()}
          className="gap-2"
        >
          <Send className="size-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
