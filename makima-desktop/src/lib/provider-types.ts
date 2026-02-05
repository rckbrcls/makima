export type Provider = "ollama" | "openai" | "anthropic";

export interface ModelInfo {
  id: string;
  name: string;
  provider: Provider;
  description?: string;
  contextWindow?: number;
  maxOutput?: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatStreamOptions {
  sessionId: string;
  model: string;
  messages: Array<ChatMessage>;
  temperature?: number;
  maxTokens?: number;
  onChunk: (content: string, done: boolean) => void;
  onError: (error: string) => void;
  onComplete?: (stats?: StreamCompletionStats) => void;
}

export interface StreamCompletionStats {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  totalDuration?: number;
}

export interface OpenAIStreamChunkEvent {
  session_id: string;
  content: string;
  done: boolean;
  finish_reason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIStreamErrorEvent {
  session_id: string;
  error: string;
}

export interface AnthropicStreamChunkEvent {
  session_id: string;
  content: string;
  done: boolean;
  stop_reason?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicStreamErrorEvent {
  session_id: string;
  error: string;
}

export const OPENAI_MODELS: Array<ModelInfo> = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Most capable GPT-4 model for complex tasks",
    contextWindow: 128000,
    maxOutput: 16384,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and cost-effective for most tasks",
    contextWindow: 128000,
    maxOutput: 16384,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    description: "Previous generation GPT-4",
    contextWindow: 128000,
    maxOutput: 4096,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    description: "Fast model for simple tasks",
    contextWindow: 16385,
    maxOutput: 4096,
  },
  {
    id: "o1",
    name: "o1",
    provider: "openai",
    description: "Reasoning model for complex problems",
    contextWindow: 200000,
    maxOutput: 100000,
  },
  {
    id: "o1-mini",
    name: "o1 Mini",
    provider: "openai",
    description: "Faster reasoning model",
    contextWindow: 128000,
    maxOutput: 65536,
  },
  {
    id: "o3-mini",
    name: "o3 Mini",
    provider: "openai",
    description: "Latest reasoning model",
    contextWindow: 200000,
    maxOutput: 100000,
  },
];

export const ANTHROPIC_MODELS: Array<ModelInfo> = [
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "anthropic",
    description: "Most capable model for complex analysis",
    contextWindow: 200000,
    maxOutput: 32000,
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
    description: "Balanced performance and speed",
    contextWindow: 200000,
    maxOutput: 64000,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Previous generation Sonnet",
    contextWindow: 200000,
    maxOutput: 8192,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    description: "Fast and efficient for simple tasks",
    contextWindow: 200000,
    maxOutput: 8192,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    description: "Previous flagship model",
    contextWindow: 200000,
    maxOutput: 4096,
  },
];

export function getModelsByProvider(provider: Provider): Array<ModelInfo> {
  switch (provider) {
    case "openai":
      return OPENAI_MODELS;
    case "anthropic":
      return ANTHROPIC_MODELS;
    default:
      return [];
  }
}

export function findModelById(
  modelId: string,
  provider?: Provider,
): ModelInfo | undefined {
  if (provider === "openai" || !provider) {
    const openaiModel = OPENAI_MODELS.find((m) => m.id === modelId);
    if (openaiModel) return openaiModel;
  }
  if (provider === "anthropic" || !provider) {
    const anthropicModel = ANTHROPIC_MODELS.find((m) => m.id === modelId);
    if (anthropicModel) return anthropicModel;
  }
  return undefined;
}

export function getProviderFromModelId(modelId: string): Provider | undefined {
  if (OPENAI_MODELS.some((m) => m.id === modelId)) return "openai";
  if (ANTHROPIC_MODELS.some((m) => m.id === modelId)) return "anthropic";
  return undefined;
}
