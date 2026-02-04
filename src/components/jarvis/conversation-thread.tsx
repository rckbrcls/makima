import { AlertTriangle, Bot, User } from "lucide-react";
import type { Conversation } from "@/components/jarvis/jarvis-types";
import { formatClock, runStatusMeta } from "@/components/jarvis/jarvis-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Blob3D } from "@/components/visuals/blob-3d";
import { cn } from "@/lib/utils";
import { Typewriter } from "../ui/typewriter";

interface ConversationThreadProps {
  activeConversation?: Conversation;
  onViewRun: (runId: string) => void;
}

export function ConversationThread({
  activeConversation,
  onViewRun,
}: ConversationThreadProps) {

  const defaultTexts = [
    "Create a responsive landing page for a SaaS product",
    "Explain how React hooks work with examples",
    "Generate a Python script to scrape data from a website",
    "Design a modern dashboard with dark mode support",
    "Help me debug a memory leak in my Node.js application",
    "Write a SQL query to analyze user retention rates",
    "Build a reusable button component with Tailwind CSS",
  ];

  return (
    <>
      {activeConversation?.globalState === "error" ? (
        <div className="mx-6 mt-4 rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-red-500" />
            <div>
              <p className="font-medium">Global error detected</p>
              <p className="text-xs text-red-200">
                This conversation indicates a critical failure. The local
                history has been preserved.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {activeConversation && activeConversation.items.length > 0 ? (
          activeConversation.items.map((item) => {
            if (item.kind === "execution") {
              const statusMeta = runStatusMeta[item.run.status];
              const StatusIcon = statusMeta.icon;

              return (
                <div key={item.id} className="max-w-3xl">
                  <Card className="border-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex size-10 items-center justify-center rounded-lg border",
                              statusMeta.className,
                            )}
                          >
                            <StatusIcon className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {item.run.title}
                            </p>
                            <p className="text-muted-foreground font-mono text-xs">
                              {item.run.command}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", statusMeta.className)}
                        >
                          {statusMeta.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                        <span>Duration: {item.run.duration}</span>
                        <span>Start: {formatClock(item.run.startedAt)}</span>
                        {item.run.finishedAt ? (
                          <span>End: {formatClock(item.run.finishedAt)}</span>
                        ) : null}
                      </div>
                      <p className="text-foreground text-sm">
                        {item.run.output}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {item.run.summary}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewRun(item.run.id)}
                      >
                        View full run
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            }

            const isUser = item.message.role === "user";
            const isError = item.message.state === "error";
            const isThinkingMessage = item.message.state === "thinking";
            const isStreamingMessage = item.message.state === "streaming";
            const visibleText = isStreamingMessage
              ? item.message.content.slice(0, item.message.streamedChars ?? 0)
              : item.message.content;

            return (
              <>
                <div
                  key={item.id}
                  className={cn(
                    "flex w-full",
                    isUser ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-3xl",
                      isUser ? "text-right" : "text-left",
                    )}
                  >
                    <div
                      className={cn(
                        "text-muted-foreground flex items-center gap-2 text-xs",
                        isUser && "justify-end",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border",
                          isUser
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted",
                        )}
                      >
                        {isUser ? (
                          <User className="size-3" />
                        ) : (
                          <Bot className="size-3" />
                        )}
                      </div>
                      <span className="font-medium">
                        {isUser ? "You" : "openClaw"}
                      </span>
                      <span>{formatClock(item.message.createdAt)}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {item.message.meta.model}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {item.message.meta.tone}
                      </Badge>
                    </div>
                    <div
                      className={cn(
                        "mt-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                        isUser
                          ? "border-primary bg-primary text-primary-foreground"
                          : isError
                            ? "border-red-900 bg-red-950 text-red-200"
                            : "border-border bg-card",
                      )}
                    >
                      {isThinkingMessage ? (
                        <span className="text-muted-foreground text-xs">
                          Thinking...
                        </span>
                      ) : (
                        <span>
                          {visibleText}
                          {isStreamingMessage ? (
                            <span className="inline-block w-2 animate-pulse">▍</span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
                <div className="h-30" />
              </>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center w-full relative">
            <Blob3D className="h-[320px] w-full max-w-3xl sm:h-[360px]" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Typewriter
                className="font-serif text-2xl text-center max-w-xl px-4 pointer-events-auto"
                baseText="Hello, I'm Makima. How can I help you today? "
                delay={1}
                textsDelay={2}
                texts={defaultTexts}
              />
            </div>
          </div>
        )}

      </div >
    </>
  );
}
