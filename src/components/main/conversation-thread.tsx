import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  Copy,
  RefreshCw,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type {
  ChatItem,
  ChatMessage,
  Conversation,
} from "@/components/main/jarvis-types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Blob3D } from "@/components/visuals/blob-3d";
import { Typewriter } from "@/components/ui/typewriter";
import { cn } from "@/lib/utils";

interface ConversationThreadProps {
  activeConversation?: Conversation;
  onViewRun?: (runId: string) => void;
  onRetry?: (messageId: string) => void;
}

const defaultSuggestions = [
  "Create a responsive landing page for a SaaS product",
  "Explain how React hooks work with examples",
  "Generate a Python script to scrape data from a website",
  "Design a modern dashboard with dark mode support",
  "Help me debug a memory leak in my Node.js application",
  "Write a SQL query to analyze user retention rates",
  "Build a reusable button component with Tailwind CSS",
];

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Parse and render content with code blocks
function renderContent(content: string): React.ReactNode {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const inlineCodeRegex = /`([^`]+)`/g;

  const parts: Array<React.ReactNode> = [];
  const lastIndex = 0;
  let match;

  // Handle code blocks first
  const contentWithCodeBlocks = content.replace(
    codeBlockRegex,
    (_, lang, code) => `\x00CODEBLOCK:${lang || ""}:${code}\x00`,
  );

  const segments = contentWithCodeBlocks.split("\x00");

  segments.forEach((segment, i) => {
    if (segment.startsWith("CODEBLOCK:")) {
      const colonIndex = segment.indexOf(":", 10);
      const lang = segment.slice(10, colonIndex);
      const code = segment.slice(colonIndex + 1);
      parts.push(
        <CodeBlock key={`code-${i}`} language={lang} code={code.trim()} />,
      );
    } else if (segment) {
      // Handle inline code within text segments
      const textParts: Array<React.ReactNode> = [];
      let textLastIndex = 0;
      const textWithInline = segment;

      while ((match = inlineCodeRegex.exec(textWithInline)) !== null) {
        if (match.index > textLastIndex) {
          textParts.push(textWithInline.slice(textLastIndex, match.index));
        }
        textParts.push(
          <code
            key={`inline-${i}-${match.index}`}
            className="bg-muted-foreground/20 rounded px-1.5 py-0.5 font-mono text-[13px]"
          >
            {match[1]}
          </code>,
        );
        textLastIndex = match.index + match[0].length;
      }

      if (textLastIndex < textWithInline.length) {
        textParts.push(textWithInline.slice(textLastIndex));
      }

      parts.push(<span key={`text-${i}`}>{textParts}</span>);
    }
  });

  return parts;
}

// Code block component
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <div className="border-border bg-card my-3 overflow-hidden rounded-lg border">
      <div className="border-border bg-muted flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-muted-foreground text-xs font-medium">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

// Streaming cursor component
function StreamingCursor() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-[1.1em] w-[2px] bg-current align-text-bottom"
      animate={{ opacity: [1, 0] }}
      transition={{
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    />
  );
}

// Thinking indicator with animated dots
function ThinkingIndicator() {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5">
      <span className="text-sm">Thinking</span>
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="bg-muted-foreground size-1 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Copy button with feedback
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [content]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
      onClick={handleCopy}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check className="size-3.5 text-emerald-500" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy className="size-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}

// User message bubble
const UserMessage = memo(function UserMessage({
  message,
}: {
  message: ChatMessage;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full justify-end"
    >
      <div className="group flex max-w-[85%] flex-col items-end gap-1 md:max-w-2xl">
        <div className="flex items-end gap-2">
          <CopyButton content={message.content} />
          <div
            className={cn(
              "rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed",
              "bg-primary text-primary-foreground",
              "shadow-sm",
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
        <span className="text-muted-foreground px-2 text-[10px]">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </motion.div>
  );
});

// Assistant message with streaming support
const AssistantMessage = memo(function AssistantMessage({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
}) {
  const isStreaming = message.state === "streaming";
  const isThinking = message.state === "thinking";
  const isError = message.state === "error";

  const visibleContent = isStreaming
    ? message.content.slice(0, message.streamedChars ?? message.content.length)
    : message.content;

  const renderedContent = useMemo(() => {
    if (isThinking || !visibleContent) return null;
    return renderContent(visibleContent);
  }, [visibleContent, isThinking]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex w-full justify-start"
    >
      <div className="group flex max-w-[85%] gap-3 md:max-w-3xl">
        <Avatar size="sm" className="mt-1 shrink-0">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <Bot className="size-3.5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <div
              className={cn(
                "min-w-0 flex-1 rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed",
                "bg-muted text-foreground",
                isError && "border border-red-900 bg-red-950 text-red-200",
              )}
            >
              {isThinking ? (
                <ThinkingIndicator />
              ) : (
                <div className="break-words whitespace-pre-wrap">
                  {renderedContent}
                  {isStreaming && <StreamingCursor />}
                </div>
              )}
            </div>
            {!isThinking && !isStreaming && (
              <div className="flex shrink-0 flex-col gap-1">
                <CopyButton content={message.content} />
                {isError && onRetry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => onRetry(message.id)}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-1">
            <span className="text-muted-foreground text-[10px]">
              {formatTime(message.createdAt)}
            </span>
            {message.meta.model && (
              <>
                <span className="text-muted-foreground text-[10px]">·</span>
                <span className="text-muted-foreground text-[10px]">
                  {message.meta.model}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Message item wrapper
const MessageItem = memo(function MessageItem({
  item,
  onRetry,
}: {
  item: ChatItem;
  onRetry?: (messageId: string) => void;
}) {
  if (item.kind !== "message") return null;

  const { message } = item;

  if (message.role === "user") {
    return <UserMessage message={message} />;
  }

  return <AssistantMessage message={message} onRetry={onRetry} />;
});

// Empty state component
function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-[320px] w-full max-w-3xl sm:h-[360px]">
        <Blob3D className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Typewriter
            className="pointer-events-auto max-w-xl px-4 text-center font-serif text-2xl"
            baseText="Hello, I'm Makima. How can I help you today? "
            delay={1}
            textsDelay={2}
            texts={defaultSuggestions}
          />
        </div>
      </div>
    </div>
  );
}

// Global error banner
function GlobalErrorBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-200 md:mx-6"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-4 shrink-0 text-red-500" />
        <div>
          <p className="font-medium">Global error detected</p>
          <p className="text-xs text-red-200">
            This conversation indicates a critical failure. The local history
            has been preserved.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Scroll to bottom button
function ScrollToBottomButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2"
    >
      <Button
        variant="secondary"
        size="sm"
        className="gap-1.5 rounded-full shadow-lg"
        onClick={onClick}
      >
        <ChevronDown className="size-4" />
        New messages
      </Button>
    </motion.div>
  );
}

// Main conversation thread component
export function ConversationThread({
  activeConversation,
  onRetry,
}: ConversationThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.items, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 100;

    setAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom && distanceFromBottom > 300);
  }, []);

  const hasMessages = activeConversation && activeConversation.items.length > 0;

  const messageItems = activeConversation?.items.filter(
    (item) => item.kind === "message",
  );

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {activeConversation?.globalState === "error" && <GlobalErrorBanner />}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-6"
      >
        {hasMessages ? (
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {messageItems?.map((item) => (
                <MessageItem key={item.id} item={item} onRetry={onRetry} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <AnimatePresence>
        {showScrollButton && <ScrollToBottomButton onClick={scrollToBottom} />}
      </AnimatePresence>
    </div>
  );
}
