import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  Cpu,
  Loader2,
  MessageSquarePlus,
  Send,
  Shield,
  Sparkles,
  Square,
  Terminal,
} from "lucide-react";
import { ActionMessage, EventMessage } from "./session-chat-items";
import { ModeToggleSafe } from "./mode-toggle-safe";
import type {
  Action,
  Agent,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

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
      <div className="bg-card border-border max-w-md rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">{question.question}</p>

        <div className="space-y-2">
          {question.options?.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full rounded-md border px-3 py-2.5 text-left transition-all",
                "hover:border-secondary hover:bg-secondary",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected(option.value) && "border-primary bg-primary",
                  )}
                >
                  {isSelected(option.value) && (
                    <Check className="text-primary-foreground size-2.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium ">{option.label}</p>
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
    </div >
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface SessionPanelProps {
  session?: Session | null;
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
  agents?: Array<Agent>;
  onAgentChange?: (agentId: string) => void;
  onCreateSession?: (agentId: string, goal: string) => Promise<void>;
  isCreating?: boolean;
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
  agents = [],
  onAgentChange,
  onCreateSession,
  isCreating,
}: SessionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [message, setMessage] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    session?.agentId ?? agents[0]?.id ?? "",
  );

  useEffect(() => {
    if (session?.agentId) {
      setSelectedAgentId(session.agentId);
    } else if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  }, [session?.agentId, agents, selectedAgentId]);

  const isActive = session?.state === "active";
  const isSessionCreated = !!session;

  // Combine and sort items for the timeline
  const timelineItems = useMemo(() => {
    if (!session) return [];

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
  }, [actions, events, questions, session]);

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

  const handleSendMessageInternal = async () => {
    if (!message.trim()) return;

    if (isSessionCreated && onSendMessage) {
      onSendMessage(message.trim());
    } else if (!isSessionCreated && onCreateSession && selectedAgentId) {
      setIsCreatingSession(true);
      try {
        await onCreateSession(selectedAgentId, message.trim());
      } finally {
        setIsCreatingSession(false);
      }
    }

    setMessage("");
    setAutoScroll(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageInternal();
    }
  };

  const handleAnswerQuestionInternal = (
    questionId: string,
    answer: string | Array<string>,
  ) => {
    onAnswerQuestion?.(questionId, answer);
  };

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (isSessionCreated) {
      onAgentChange?.(agentId);
    }
  };

  const currentAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <Card className="border-border gap-0 flex h-full flex-col overflow-hidden p-0">
      {/* Minimal Header */}
      <div className="border-border bg-card flex flex-none items-center border-b justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isSessionCreated ? (
            <p className="text-sm font-medium">
              {session.goal}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-muted flex size-6 items-center justify-center rounded-full">
                <MessageSquarePlus className="text-primary size-3" />
              </div>
              <p className="text-sm font-medium">New Session</p>
            </div>
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

      <div className="relative flex-1 min-h-0 bg-background">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto pb-30"
        >
          {!isSessionCreated ? (
            /* New Session Start View */
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center h-full">
              <div className="max-w-md">
                <div className="bg-muted mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
                  <Sparkles className="text-primary size-8" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">
                  Start a conversation with {currentAgent?.name ?? "an agent"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  Describe what you want to accomplish. This will be the goal of your
                  session.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Badge
                    variant="outline"
                    className="hover:bg-muted cursor-pointer text-xs"
                    onClick={() => setMessage("Fix a bug in ")}
                  >
                    Fix a bug
                  </Badge>
                  <Badge
                    variant="outline"
                    className="hover:bg-muted cursor-pointer text-xs"
                    onClick={() => setMessage("Add a feature to ")}
                  >
                    Add a feature
                  </Badge>
                  <Badge
                    variant="outline"
                    className="hover:bg-muted cursor-pointer text-xs"
                    onClick={() => setMessage("Refactor ")}
                  >
                    Refactor code
                  </Badge>
                  <Badge
                    variant="outline"
                    className="hover:bg-muted cursor-pointer text-xs"
                    onClick={() => setMessage("Write tests for ")}
                  >
                    Write tests
                  </Badge>
                </div>
              </div>
            </div>
          ) : timelineItems.length === 0 ? (
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
                return (
                  <QuestionOptions
                    key={item.data.id}
                    question={item.data}
                    onAnswer={handleAnswerQuestionInternal}
                  />
                );
              })}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 px-4 py-3">
                  <div className="bg-card flex size-8 items-center justify-center rounded-full">
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
        </div>

        {/* Scroll to bottom button */}
        {!autoScroll && isSessionCreated && (
          <Button
            variant="outline"
            size="icon"
            className="bg-card absolute right-6 bottom-20 size-8 rounded-full shadow-lg z-20"
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

        {/* Input Area - Always visible */}
        <div className="border-border absolute bottom-4  left-4 right-4 p-2 bg-card flex flex-col gap-2 pb-4 border rounded-xl z-20">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                pendingQuestion
                  ? "Type a custom response or select an option above..."
                  : !isSessionCreated
                    ? "What would you like to work on?"
                    : "Type a message..."
              }
              className="min-h-[32px] h-full resize-none bg-card border-none md:text-sm text-sm"
              rows={1}
              autoFocus={!isSessionCreated}
            />
            <Button
              size="icon"
              className="h-[36px] w-[36px] shrink-0"
              disabled={!message.trim() || isLoading || isCreating || isCreatingSession}
              onClick={handleSendMessageInternal}
            >
              {isCreating || isCreatingSession ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 ">
            <Select value={selectedAgentId} onValueChange={handleAgentChange}>
              <SelectTrigger className="w-auto h-7 text-xs border hover:bg-accent/50 gap-1 px-2.5 focus:ring-0 shadow-none">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <Cpu className="size-3.5 text-muted-foreground" />
                      <span className="text-xs">{agent.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>


      {/* Completed/Failed state */}
      {!isActive && isSessionCreated && (
        <div className="border-border bg-card flex-none border-t p-3">
          <p className="text-muted-foreground text-center text-xs">
            Session {session.state === "done" ? "completed" : "ended"} at{" "}
            {new Date(session.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </Card>
  );
}
