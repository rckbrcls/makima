import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  Cpu,
  Loader2,
  Send,
  Shield,
  Square,
  Terminal,
} from "lucide-react";
import { ActionMessage, EventMessage } from "./session-chat-items";
import type {
  Action,
  AgentEvent,
  AgentQuestion,
  BridgeMode,
  Session,
} from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type TimelineItem =
  | { type: "action"; data: Action; date: Date }
  | { type: "event"; data: AgentEvent; date: Date }
  | { type: "question"; data: AgentQuestion; date: Date };

// ============================================================================
// Question Options Component
// ============================================================================

interface QuestionOptionsProps {
  question: AgentQuestion;
  onAnswer: (questionId: string, answer: string | Array<string>) => void;
}

function QuestionOptions({ question, onAnswer }: QuestionOptionsProps) {
  const [selected, setSelected] = useState<string | Array<string>>(
    question.multiSelect ? [] : "",
  );

  const handleSelect = (value: string) => {
    if (question.multiSelect) {
      setSelected((prev) => {
        const arr = prev as Array<string>;
        return arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value];
      });
    } else {
      setSelected(value);
    }
  };

  const handleSubmit = () => {
    if (question.multiSelect) {
      if ((selected as Array<string>).length > 0) {
        onAnswer(question.id, selected);
      }
    } else if (selected) {
      onAnswer(question.id, selected as string);
    }
  };

  const isSelected = (value: string) => {
    if (question.multiSelect) {
      return (selected as Array<string>).includes(value);
    }
    return selected === value;
  };

  if (question.answered) {
    const answerLabels = question.options
      ?.filter((opt) =>
        Array.isArray(question.answer)
          ? question.answer.includes(opt.value)
          : question.answer === opt.value,
      )
      .map((opt) => opt.label)
      .join(", ");

    return (
      <div className="flex justify-end px-4 py-2">
        <div className="bg-primary text-primary-foreground max-w-[80%] rounded-lg rounded-tr-none px-4 py-2">
          <p className="text-sm">{answerLabels || question.answer}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="bg-muted border-border max-w-md rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">{question.question}</p>

        <div className="space-y-2">
          {question.options?.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full rounded-md border px-3 py-2.5 text-left transition-all",
                "hover:border-primary hover:bg-accent",
                isSelected(option.value)
                  ? "border-primary bg-accent text-primary"
                  : "border-border bg-background",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected(option.value)
                      ? "border-primary bg-primary"
                      : "border-muted",
                  )}
                >
                  {isSelected(option.value) && (
                    <Check className="text-primary-foreground size-2.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  {option.description && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              question.multiSelect
                ? (selected as Array<string>).length === 0
                : !selected
            }
            className="flex-1"
          >
            Confirm
          </Button>
        </div>

        <p className="text-muted-foreground mt-2 text-center text-[10px]">
          Or type a custom response below
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface SessionPanelProps {
  session: Session;
  actions: Array<Action>;
  events: Array<AgentEvent>;
  questions?: Array<AgentQuestion>;
  agentName?: string;
  onEndSession?: (success: boolean) => void;
  onSendMessage?: (message: string) => void;
  onAnswerQuestion?: (
    questionId: string,
    answer: string | Array<string>,
  ) => void;
  isLoading?: boolean;
  mode: BridgeMode;
  pendingCount: number;
  onToggleMode: () => void;
  onOpenApprovals: () => void;
}

export function SessionPanel({
  session,
  actions,
  events,
  questions = [],
  agentName = "Agent",
  onEndSession,
  onSendMessage,
  onAnswerQuestion,
  isLoading,
  mode,
  pendingCount,
  onToggleMode,
  onOpenApprovals,
}: SessionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [message, setMessage] = useState("");

  const isActive = session.state === "active";

  // Combine and sort items for the timeline
  const timelineItems = useMemo(() => {
    const items: Array<TimelineItem> = [
      ...actions.map((a) => ({
        type: "action" as const,
        data: a,
        date: new Date(a.createdAt),
      })),
      ...events.map((e) => ({
        type: "event" as const,
        data: e,
        date: new Date(e.createdAt),
      })),
      ...questions.map((q) => ({
        type: "question" as const,
        data: q,
        date: new Date(q.createdAt),
      })),
    ];
    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [actions, events, questions]);

  // Find unanswered question
  const pendingQuestion = questions.find((q) => !q.answered);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [timelineItems, autoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (autoScroll !== isAtBottom) {
        setAutoScroll(isAtBottom);
      }
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !onSendMessage) return;
    onSendMessage(message.trim());
    setMessage("");
    setAutoScroll(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAnswerQuestion = (
    questionId: string,
    answer: string | Array<string>,
  ) => {
    onAnswerQuestion?.(questionId, answer);
  };

  return (
    <Card className="border-border flex h-full flex-col overflow-hidden">
      {/* Minimal Header */}
      <div className="border-border bg-card flex flex-none items-center justify-between border-b px-4 py-2.5">
        import {ModeToggleSafe} from "./mode-toggle-safe" //... //...
        <div className="flex items-center gap-2">
          <div className="bg-muted flex size-6 items-center justify-center rounded-full">
            <Cpu className="text-primary size-3.5" />
          </div>
          <div>
            <p className="text-sm font-medium">{agentName}</p>
          </div>
          {isActive && (
            <Badge
              variant="outline"
              className="h-5 border-green-500 text-[10px] text-green-500"
            >
              <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-green-500" />
              Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ModeToggleSafe mode={mode} onToggle={onToggleMode} />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={onOpenApprovals}
          >
            <Shield className="size-3.5" />
            <span className="hidden sm:inline">Approvals</span>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[0.55rem]">
                {pendingCount}
              </Badge>
            )}
          </Button>
          {isActive && onEndSession && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-7 px-2 text-xs"
              onClick={() => onEndSession(false)}
            >
              <Square className="mr-1 size-3 fill-current" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Goal Banner */}
      <div className="bg-muted border-border flex-none border-b px-4 py-2">
        <p className="text-muted-foreground text-xs">
          <span className="font-medium">Goal:</span> {session.goal}
        </p>
      </div>

      {/* Chat Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-background min-h-0 flex-1 overflow-y-auto"
      >
        {timelineItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <Terminal className="text-muted mb-3 size-10" />
            <p className="text-muted-foreground text-sm">Session started</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {agentName} is analyzing your request...
            </p>
          </div>
        ) : (
          <div className="flex flex-col py-2">
            {timelineItems.map((item) => {
              if (item.type === "action") {
                return <ActionMessage key={item.data.id} action={item.data} />;
              }
              if (item.type === "event") {
                return <EventMessage key={item.data.id} event={item.data} />;
              }
              <QuestionOptions
                    key={item.data.id}
                    question={item.data}
                    onAnswer={handleAnswerQuestion}
                  />
              return null;
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 px-4 py-3">
                <div className="bg-muted flex size-8 items-center justify-center rounded-full">
                  <Loader2 className="text-muted-foreground size-4 animate-spin" />
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-sm">
                    {agentName} is working...
                  </span>
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>
        )}

        {/* Scroll to bottom button */}
        {!autoScroll && (
          <Button
            variant="outline"
            size="icon"
            className="bg-background absolute right-6 bottom-20 size-8 rounded-full shadow-lg"
            onClick={() => {
              setAutoScroll(true);
              scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth",
              });
            }}
          >
            <ArrowDown className="size-4" />
          </Button>
        )}
      </div>

      {/* Input Area - Always visible when active */}
      {isActive && (
        <div className="border-border bg-card flex-none border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                pendingQuestion
                  ? "Type a custom response or select an option above..."
                  : "Type a message..."
              }
              className="max-h-[120px] min-h-[44px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              className="size-[44px] shrink-0"
              disabled={!message.trim() || isLoading}
              onClick={handleSendMessage}
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-1.5 text-center text-[10px]">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}

      {/* Completed/Failed state */}
      {!isActive && (
        <div className="border-border bg-muted flex-none border-t p-3">
          <p className="text-muted-foreground text-center text-xs">
            Session {session.state === "done" ? "completed" : "ended"} at{" "}
            {new Date(session.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </Card>
  );
}
