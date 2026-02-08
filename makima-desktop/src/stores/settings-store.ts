import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Provider } from "@/lib/provider-types";
import type { AuthSourcePreference } from "@/lib/auth-types";
import { createTauriStorage } from "@/lib/tauri-storage";

export type BridgeMode = "safe" | "auto";

// ============================================================================
// Settings Store - Persistent settings using Zustand + Tauri Store
// ============================================================================

interface SettingsState {
  // Global mode (safe = require approvals, auto = auto-approve low risk)
  mode: BridgeMode;

  // User preferences
  preferences: {
    // Auto-approve settings
    autoApproveReadOnly: boolean; // Auto-approve read_file, list_files, git_status, etc.
    autoApproveLowRisk: boolean; // Auto-approve low-risk actions in auto mode

    // UI preferences
    compactMode: boolean; // Compact card display
    showEventNotifications: boolean; // Show toast for agent events

    // Session defaults
    defaultProvider: Provider;
    defaultModel: string;
  };

  // Provider configurations
  providers: {
    ollama: {
      enabled: boolean;
      endpoint?: string;
      numParallel?: number;
    };
    openai: {
      enabled: boolean;
      apiKey?: string;
      preferredAuthSource?: AuthSourcePreference;
    };
    anthropic: {
      enabled: boolean;
      apiKey?: string;
      preferredAuthSource?: AuthSourcePreference;
    };
  };

  // Hydration state
  _hasHydrated: boolean;
}

interface SettingsActions {
  // Mode
  setMode: (mode: BridgeMode) => void;
  toggleMode: () => void;

  // Preferences
  setPreference: <K extends keyof SettingsState["preferences"]>(
    key: K,
    value: SettingsState["preferences"][K],
  ) => void;
  setPreferences: (prefs: Partial<SettingsState["preferences"]>) => void;

  // Providers
  setProviderConfig: <K extends keyof SettingsState["providers"]>(
    provider: K,
    config: Partial<SettingsState["providers"][K]>,
  ) => void;

  // Reset
  resetSettings: () => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const defaultSettings: Omit<SettingsState, "_hasHydrated"> = {
  mode: "safe",
  preferences: {
    autoApproveReadOnly: false,
    autoApproveLowRisk: false,
    compactMode: false,
    showEventNotifications: true,
    defaultProvider: "ollama",
    defaultModel: "llama3.2",
  },
  providers: {
    ollama: { enabled: true, numParallel: 1 },
    openai: { enabled: false },
    anthropic: { enabled: false },
  },
};

// Migration function for old settings format
function migrateSettings(
  state: Record<string, unknown>,
): Partial<SettingsState> {
  const migrated: Partial<SettingsState> = {};

  // Migrate old providers format
  if (state.providers) {
    const oldProviders = state.providers as Record<string, unknown>;
    if (
      "cli" in oldProviders ||
      "local" in oldProviders ||
      "api" in oldProviders
    ) {
      migrated.providers = {
        ollama: {
          enabled:
            (oldProviders.local as { enabled?: boolean })?.enabled ?? true,
          endpoint: (oldProviders.local as { endpoint?: string })?.endpoint,
        },
        openai: {
          enabled: false,
        },
        anthropic: {
          enabled:
            (oldProviders.api as { enabled?: boolean })?.enabled ?? false,
          apiKey: (oldProviders.api as { apiKey?: string })?.apiKey,
        },
      };
    }
  }

  // Migrate old defaultProvider
  if (state.preferences) {
    const oldPrefs = state.preferences as Record<string, unknown>;
    if (
      oldPrefs.defaultProvider === "cli" ||
      oldPrefs.defaultProvider === "local"
    ) {
      migrated.preferences = {
        ...(oldPrefs as SettingsState["preferences"]),
        defaultProvider: "ollama",
      };
    } else if (oldPrefs.defaultProvider === "api") {
      migrated.preferences = {
        ...(oldPrefs as SettingsState["preferences"]),
        defaultProvider: "anthropic",
      };
    }
  }

  return migrated;
}

const tauriStorage = createTauriStorage("settings.json");

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      _hasHydrated: false,

      // Mode
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === "safe" ? "auto" : "safe",
        })),

      // Preferences
      setPreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),
      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      // Providers
      setProviderConfig: (provider, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], ...config },
          },
        })),

      // Reset
      resetSettings: () => set({ ...defaultSettings }),

      // Hydration
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "makima-settings",
      version: 3,
      storage: createJSONStorage(() => tauriStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        mode: state.mode,
        preferences: state.preferences,
        providers: state.providers,
      }),
      migrate: (persistedState, version) => {
        let state = persistedState as Record<string, unknown>;

        if (version === 0) {
          const migrated = migrateSettings(state);
          state = { ...state, ...migrated };
        }

        return state as unknown as SettingsState;
      },
    },
  ),
);

// Hook to wait for hydration
export const useSettingsHydrated = () =>
  useSettingsStore((state) => state._hasHydrated);

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// Mode selectors
export const useMode = () => useSettingsStore((s) => s.mode);

export const useIsSafeMode = () => useSettingsStore((s) => s.mode === "safe");

export const useIsAutoMode = () => useSettingsStore((s) => s.mode === "auto");

// Preference selectors
export const useAutoApproveReadOnly = () =>
  useSettingsStore((s) => s.preferences.autoApproveReadOnly);

export const useAutoApproveLowRisk = () =>
  useSettingsStore((s) => s.preferences.autoApproveLowRisk);

export const useCompactMode = () =>
  useSettingsStore((s) => s.preferences.compactMode);

export const useShowEventNotifications = () =>
  useSettingsStore((s) => s.preferences.showEventNotifications);

export const useDefaultProvider = () =>
  useSettingsStore((s) => s.preferences.defaultProvider);

export const useDefaultModel = () =>
  useSettingsStore((s) => s.preferences.defaultModel);

export const usePreferences = () => useSettingsStore((s) => s.preferences);

// Provider config selectors
export const useOllamaConfig = () =>
  useSettingsStore((s) => s.providers.ollama);

export const useOpenAIConfig = () =>
  useSettingsStore((s) => s.providers.openai);

export const useAnthropicConfig = () =>
  useSettingsStore((s) => s.providers.anthropic);

export const useOpenAIAuthPreference = () =>
  useSettingsStore((s) => s.providers.openai.preferredAuthSource);

export const useAnthropicAuthPreference = () =>
  useSettingsStore((s) => s.providers.anthropic.preferredAuthSource);

export const useProviders = () => useSettingsStore((s) => s.providers);

// Actions selector (stable reference)
export const useSettingsActions = () =>
  useSettingsStore(
    useShallow((s) => ({
      setMode: s.setMode,
      toggleMode: s.toggleMode,
      setPreference: s.setPreference,
      setPreferences: s.setPreferences,
      setProviderConfig: s.setProviderConfig,
      resetSettings: s.resetSettings,
    })),
  );
