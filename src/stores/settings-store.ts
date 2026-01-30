import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Store } from '@tauri-apps/plugin-store'
import type { BridgeMode } from '@/components/agents/types'

// ============================================================================
// Settings Store - Persistent settings using Zustand + Tauri Store
// ============================================================================

interface SettingsState {
  // Global mode (safe = require approvals, auto = auto-approve low risk)
  mode: BridgeMode

  // User preferences
  preferences: {
    // Auto-approve settings
    autoApproveReadOnly: boolean // Auto-approve read_file, list_files, git_status, etc.
    autoApproveLowRisk: boolean // Auto-approve low-risk actions in auto mode

    // UI preferences
    compactMode: boolean // Compact card display
    showEventNotifications: boolean // Show toast for agent events

    // Session defaults
    defaultProvider: 'cli' | 'local' | 'api'
    defaultModel: string
  }

  // Provider configurations (placeholder for future)
  providers: {
    cli: {
      enabled: boolean
      path?: string
    }
    local: {
      enabled: boolean
      endpoint?: string
    }
    api: {
      enabled: boolean
      apiKey?: string
    }
  }

  // Hydration state
  _hasHydrated: boolean
}

interface SettingsActions {
  // Mode
  setMode: (mode: BridgeMode) => void
  toggleMode: () => void

  // Preferences
  setPreference: <K extends keyof SettingsState['preferences']>(
    key: K,
    value: SettingsState['preferences'][K]
  ) => void
  setPreferences: (prefs: Partial<SettingsState['preferences']>) => void

  // Providers
  setProviderConfig: <K extends keyof SettingsState['providers']>(
    provider: K,
    config: Partial<SettingsState['providers'][K]>
  ) => void

  // Reset
  resetSettings: () => void

  // Hydration
  setHasHydrated: (state: boolean) => void
}

export type SettingsStore = SettingsState & SettingsActions

const defaultSettings: Omit<SettingsState, '_hasHydrated'> = {
  mode: 'safe',
  preferences: {
    autoApproveReadOnly: false,
    autoApproveLowRisk: false,
    compactMode: false,
    showEventNotifications: true,
    defaultProvider: 'cli',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  providers: {
    cli: { enabled: true },
    local: { enabled: false },
    api: { enabled: false },
  },
}

// Custom storage adapter for Tauri Store
const tauriStorage = {
  store: null as Store | null,

  getItem: async (name: string): Promise<string | null> => {
    try {
      if (!tauriStorage.store) {
        tauriStorage.store = await Store.load('settings.json', { autoSave: true })
      }
      const value = await tauriStorage.store.get<string>(name)
      return value ?? null
    } catch (error) {
      console.warn('Failed to load from Tauri store, using localStorage fallback:', error)
      return localStorage.getItem(name)
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (!tauriStorage.store) {
        tauriStorage.store = await Store.load('settings.json', { autoSave: true })
      }
      await tauriStorage.store.set(name, value)
      await tauriStorage.store.save()
    } catch (error) {
      console.warn('Failed to save to Tauri store, using localStorage fallback:', error)
      localStorage.setItem(name, value)
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      if (!tauriStorage.store) {
        tauriStorage.store = await Store.load('settings.json', { autoSave: true })
      }
      await tauriStorage.store.delete(name)
      await tauriStorage.store.save()
    } catch (error) {
      console.warn('Failed to remove from Tauri store, using localStorage fallback:', error)
      localStorage.removeItem(name)
    }
  },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      _hasHydrated: false,

      // Mode
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({
        mode: state.mode === 'safe' ? 'auto' : 'safe'
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
      name: 'commander-settings',
      storage: createJSONStorage(() => tauriStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        mode: state.mode,
        preferences: state.preferences,
        providers: state.providers,
      }),
    }
  )
)

// Hook to wait for hydration
export const useSettingsHydrated = () => useSettingsStore((state) => state._hasHydrated)
