export type ConversationStatus = "idle" | "running" | "error";
export type ConversationState = "active" | "finished" | "error";
export type GlobalState = "ok" | "warning" | "error";
export type MessageState = "normal" | "thinking" | "streaming" | "error";
export type MessageRole = "user" | "assistant";
export type RunStatus = "running" | "success" | "error" | "cancelled";
export type InputState = "idle" | "thinking" | "executing";

export interface MessageMeta {
  provider: string;
  model: string;
  tone: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  state: MessageState;
  content: string;
  createdAt: number;
  meta: MessageMeta;
  streamedChars?: number;
}

export interface ExecutionStep {
  id: string;
  label: string;
  status: "pending" | "running" | "success" | "error";
}

export interface ExecutionRun {
  id: string;
  title: string;
  command: string;
  status: RunStatus;
  duration: string;
  output: string;
  startedAt: number;
  finishedAt?: number;
  summary: string;
  steps: Array<ExecutionStep>;
  logs: Array<string>;
}

export type ChatItem =
  | { id: string; kind: "message"; message: ChatMessage }
  | { id: string; kind: "execution"; run: ExecutionRun };

export interface Conversation {
  id: string;
  title: string;
  summary: string;
  status: ConversationStatus;
  state: ConversationState;
  createdAt: number;
  updatedAt: number;
  globalState?: GlobalState;
  repositoryId?: string;
  items: Array<ChatItem>;
}
