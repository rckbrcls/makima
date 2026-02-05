import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  OllamaConnectionState,
  OllamaModelInfo,
} from "@/lib/ollama-types";
import type { AuthSourceAvailability, AuthStatus } from "@/lib/auth-types";

// ============================================================================
// Provider Store - Centralized state for Ollama, OpenAI, Anthropic providers
// ============================================================================

interface OllamaState {
  connectionState: OllamaConnectionState;
  models: Array<OllamaModelInfo>;
  isLoadingModels: boolean;
  pullingModel: string | null;
  pullProgress: number | null;
}

interface ProviderState {
  // Ollama
  ollama: OllamaState;

  // Auth status (from backend)
  authStatus: AuthStatus | null;
  isAuthLoading: boolean;
  anthropicAvailability: AuthSourceAvailability | null;
  openaiAvailability: AuthSourceAvailability | null;
}

interface ProviderActions {
  // Ollama actions
  setOllamaConnectionState: (state: OllamaConnectionState) => void;
  setOllamaModels: (models: Array<OllamaModelInfo>) => void;
  setIsLoadingModels: (loading: boolean) => void;
  setPullingModel: (model: string | null) => void;
  setPullProgress: (progress: number | null) => void;

  // Auth actions
  setAuthStatus: (status: AuthStatus | null) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setAnthropicAvailability: (
    availability: AuthSourceAvailability | null,
  ) => void;
  setOpenaiAvailability: (availability: AuthSourceAvailability | null) => void;
}

export type ProviderStore = ProviderState & ProviderActions;

const initialState: ProviderState = {
  ollama: {
    connectionState: { isConnected: false, isChecking: true },
    models: [],
    isLoadingModels: false,
    pullingModel: null,
    pullProgress: null,
  },
  authStatus: null,
  isAuthLoading: true,
  anthropicAvailability: null,
  openaiAvailability: null,
};

export const useProviderStore = create<ProviderStore>((set) => ({
  ...initialState,

  // Ollama actions
  setOllamaConnectionState: (connectionState) =>
    set((state) => ({
      ollama: { ...state.ollama, connectionState },
    })),

  setOllamaModels: (models) =>
    set((state) => ({
      ollama: { ...state.ollama, models },
    })),

  setIsLoadingModels: (isLoadingModels) =>
    set((state) => ({
      ollama: { ...state.ollama, isLoadingModels },
    })),

  setPullingModel: (pullingModel) =>
    set((state) => ({
      ollama: { ...state.ollama, pullingModel },
    })),

  setPullProgress: (pullProgress) =>
    set((state) => ({
      ollama: { ...state.ollama, pullProgress },
    })),

  // Auth actions
  setAuthStatus: (authStatus) => set({ authStatus }),
  setIsAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setAnthropicAvailability: (anthropicAvailability) =>
    set({ anthropicAvailability }),
  setOpenaiAvailability: (openaiAvailability) => set({ openaiAvailability }),
}));

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// Ollama selectors
export const useOllamaConnectionState = () =>
  useProviderStore((s) => s.ollama.connectionState);

export const useOllamaConnected = () =>
  useProviderStore((s) => s.ollama.connectionState.isConnected);

export const useOllamaChecking = () =>
  useProviderStore((s) => s.ollama.connectionState.isChecking);

export const useOllamaModels = () => useProviderStore((s) => s.ollama.models);

export const useIsLoadingModels = () =>
  useProviderStore((s) => s.ollama.isLoadingModels);

export const usePullingModel = () =>
  useProviderStore((s) => s.ollama.pullingModel);

export const usePullProgress = () =>
  useProviderStore((s) => s.ollama.pullProgress);

// Auth selectors
export const useAuthStatus = () => useProviderStore((s) => s.authStatus);

export const useIsAuthLoading = () => useProviderStore((s) => s.isAuthLoading);

export const useAnthropicAvailability = () =>
  useProviderStore((s) => s.anthropicAvailability);

export const useOpenaiAvailability = () =>
  useProviderStore((s) => s.openaiAvailability);

// Derived selectors
export const useOpenAIConfigured = () =>
  useProviderStore((s) => s.authStatus?.openai.is_configured ?? false);

export const useAnthropicConfigured = () =>
  useProviderStore((s) => s.authStatus?.anthropic.is_configured ?? false);

export const useOpenAISource = () =>
  useProviderStore((s) => s.authStatus?.openai.source);

export const useAnthropicSource = () =>
  useProviderStore((s) => s.authStatus?.anthropic.source);

// Actions selector (stable reference)
export const useProviderActions = () =>
  useProviderStore(
    useShallow((s) => ({
      setOllamaConnectionState: s.setOllamaConnectionState,
      setOllamaModels: s.setOllamaModels,
      setIsLoadingModels: s.setIsLoadingModels,
      setPullingModel: s.setPullingModel,
      setPullProgress: s.setPullProgress,
      setAuthStatus: s.setAuthStatus,
      setIsAuthLoading: s.setIsAuthLoading,
      setAnthropicAvailability: s.setAnthropicAvailability,
      setOpenaiAvailability: s.setOpenaiAvailability,
    })),
  );
