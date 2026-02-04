import { ArrowUp, Folder, Mic, Plus, Send } from "lucide-react";
import type { InputState } from "@/components/jarvis/jarvis-types";
import { inputStateMeta } from "@/components/jarvis/jarvis-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";

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
    <div className="bg-card border border-border absolute bottom-4 left-4 right-4  flex flex-col gap-2 p-2  rounded-2xl z-20">
      <Textarea
        value={composerValue}
        onChange={(event) => onComposerChange(event.target.value)}
        rows={composerRows}
        placeholder="Write your message..."
        disabled={hasRunningExecution}
        className="resize-none bg-transparent  border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <div className="flex justify-between items-end">
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Plus className="size-4" />
          </Button>

          <NativeSelect className="glass text-xs rounded-full" defaultValue="gemma">
            <NativeSelectOption value="gemma" label="Gemma" />
            <NativeSelectOption value="qwen" label="Qwen" />
            <NativeSelectOption value="gpt-4o" label="GPT-4O" />
            <NativeSelectOption value="gpt-4o-mini" label="GPT-4O Mini" />
            <NativeSelectOption value="gpt-4o-2024-08-06" label="GPT-4O 2024-08-06" />
          </NativeSelect>
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
            disabled={hasRunningExecution || !composerValue.trim()}
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
