import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Provider } from "@/lib/provider-types";

// ============================================================================
// Chat Store - Composer state and model selection
// ============================================================================

interface ChatState {
  // Composer
  composerValue: string;
  composerRows: number;

  // Model selection
  selectedProvider: Provider;
  selectedModel: string;

  // Tone (future use)
  tone: string;
}

interface ChatActions {
  // Composer
  setComposerValue: (value: string) => void;
  setComposerRows: (rows: number) => void;
  clearComposer: () => void;

  // Model selection
  setSelectedProvider: (provider: Provider) => void;
  setSelectedModel: (model: string) => void;
  selectModel: (model: string, provider: Provider) => void;

  // Tone
  setTone: (tone: string) => void;

  // Reset
  resetChat: () => void;
}

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  composerValue: "",
  composerRows: 1,
  selectedProvider: "ollama",
  selectedModel: "",
  tone: "balanced",
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  // Composer actions
  setComposerValue: (composerValue) => {
    const lines = composerValue.split("\n").length;
    const composerRows = Math.min(6, Math.max(1, lines));
    set({ composerValue, composerRows });
  },

  setComposerRows: (composerRows) => set({ composerRows }),

  clearComposer: () => set({ composerValue: "", composerRows: 1 }),

  // Model selection actions
  setSelectedProvider: (selectedProvider) => set({ selectedProvider }),

  setSelectedModel: (selectedModel) => set({ selectedModel }),

  selectModel: (selectedModel, selectedProvider) =>
    set({ selectedModel, selectedProvider }),

  // Tone
  setTone: (tone) => set({ tone }),

  // Reset
  resetChat: () => set(initialState),
}));

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// Composer selectors
export const useComposerValue = () => useChatStore((s) => s.composerValue);

export const useComposerRows = () => useChatStore((s) => s.composerRows);

export const useHasComposerContent = () =>
  useChatStore((s) => s.composerValue.trim().length > 0);

// Model selectors
export const useSelectedProvider = () =>
  useChatStore((s) => s.selectedProvider);

export const useSelectedModel = () => useChatStore((s) => s.selectedModel);

export const useHasSelectedModel = () =>
  useChatStore((s) => Boolean(s.selectedModel));

export const useModelSelection = () =>
  useChatStore(
    useShallow((s) => ({
      provider: s.selectedProvider,
      model: s.selectedModel,
    })),
  );

// Tone selector
export const useTone = () => useChatStore((s) => s.tone);

// Actions selector (stable reference)
export const useChatActions = () =>
  useChatStore(
    useShallow((s) => ({
      setComposerValue: s.setComposerValue,
      setComposerRows: s.setComposerRows,
      clearComposer: s.clearComposer,
      setSelectedProvider: s.setSelectedProvider,
      setSelectedModel: s.setSelectedModel,
      selectModel: s.selectModel,
      setTone: s.setTone,
      resetChat: s.resetChat,
    })),
  );
