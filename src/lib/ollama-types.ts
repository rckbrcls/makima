export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OllamaModelInfo {
  name: string
  size?: number
  digest?: string
  modified_at?: string
}

export interface StreamChunkEvent {
  session_id: string
  content: string
  done: boolean
  done_reason?: string
  total_duration?: number
  eval_count?: number
}

export interface StreamErrorEvent {
  session_id: string
  error: string
}

export interface ChatStreamOptions {
  sessionId: string
  model: string
  messages: OllamaMessage[]
  temperature?: number
  maxTokens?: number
  onChunk: (content: string, done: boolean) => void
  onError: (error: string) => void
  onComplete?: (stats?: { totalDuration?: number; evalCount?: number }) => void
}

export interface OllamaConnectionState {
  isConnected: boolean
  isChecking: boolean
  lastError?: string
}

export interface PullProgressEvent {
  model: string
  status: string
  progress?: number
  done: boolean
}

export interface AvailableModel {
  name: string
  description: string
  size: string
  tags: string[]
}

export const POPULAR_MODELS: AvailableModel[] = [
  {
    name: "llama3.2",
    description: "Meta's latest lightweight model, great for general tasks",
    size: "2GB",
    tags: ["fast", "general"],
  },
  {
    name: "llama3.2:1b",
    description: "Smallest Llama model, very fast",
    size: "1.3GB",
    tags: ["tiny", "fast"],
  },
  {
    name: "llama3.1",
    description: "Meta's Llama 3.1 8B model",
    size: "4.7GB",
    tags: ["balanced", "general"],
  },
  {
    name: "llama3.1:70b",
    description: "Large Llama model for complex tasks",
    size: "40GB",
    tags: ["large", "powerful"],
  },
  {
    name: "mistral",
    description: "Mistral 7B - fast and efficient",
    size: "4.1GB",
    tags: ["fast", "efficient"],
  },
  {
    name: "mixtral",
    description: "Mixtral 8x7B MoE model",
    size: "26GB",
    tags: ["large", "moe"],
  },
  {
    name: "codellama",
    description: "Specialized for code generation",
    size: "3.8GB",
    tags: ["code", "programming"],
  },
  {
    name: "deepseek-coder",
    description: "DeepSeek Coder for programming tasks",
    size: "776MB",
    tags: ["code", "small"],
  },
  {
    name: "phi3",
    description: "Microsoft Phi-3 mini model",
    size: "2.2GB",
    tags: ["small", "fast"],
  },
  {
    name: "gemma2",
    description: "Google's Gemma 2 model",
    size: "5.4GB",
    tags: ["general", "google"],
  },
  {
    name: "qwen2.5",
    description: "Alibaba's Qwen 2.5 model",
    size: "4.7GB",
    tags: ["multilingual", "general"],
  },
  {
    name: "qwen2.5-coder",
    description: "Qwen specialized for coding",
    size: "4.7GB",
    tags: ["code", "programming"],
  },
]
