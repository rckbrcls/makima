import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { Store } from "@tauri-apps/plugin-store";

// ============================================================================
// Code Layout Store - Persistent UI preferences for the Code Tab
// ============================================================================

interface CodeLayoutState {
  // Panel layout sizes (percentage-based, keyed by panel id)
  panelLayout: Record<string, number> | null;

  // Panel collapsed states
  agentPanelCollapsed: boolean;
  gitPanelCollapsed: boolean;

  // Git changes view preferences
  fileListView: "flat" | "tree";
  diffView: "inline" | "split";
  expandedSections: Array<string>;
  splitPosition: number;

  // Last active repository
  lastActiveRepositoryId: string | null;

  // Hydration state
  _hasHydrated: boolean;
}

interface CodeLayoutActions {
  setPanelLayout: (layout: Record<string, number>) => void;
  setAgentPanelCollapsed: (collapsed: boolean) => void;
  setGitPanelCollapsed: (collapsed: boolean) => void;
  setFileListView: (view: "flat" | "tree") => void;
  setDiffView: (view: "inline" | "split") => void;
  setExpandedSections: (sections: Array<string>) => void;
  toggleSection: (section: string) => void;
  setSplitPosition: (position: number) => void;
  setLastActiveRepositoryId: (id: string | null) => void;
  setHasHydrated: (state: boolean) => void;
}

export type CodeLayoutStore = CodeLayoutState & CodeLayoutActions;

const defaultState: Omit<CodeLayoutState, "_hasHydrated"> = {
  panelLayout: null,
  agentPanelCollapsed: false,
  gitPanelCollapsed: false,
  fileListView: "flat",
  diffView: "inline",
  expandedSections: ["staged", "unstaged", "untracked"],
  splitPosition: 50,
  lastActiveRepositoryId: null,
};

// Check if running in browser environment
const isBrowser = typeof window !== "undefined";

// Custom storage adapter for Tauri Store
const tauriCodeLayoutStorage = {
  store: null as Store | null,

  getItem: async (name: string): Promise<string | null> => {
    if (!isBrowser) return null;

    try {
      if (!tauriCodeLayoutStorage.store) {
        tauriCodeLayoutStorage.store = await Store.load("code-layout.json", {
          autoSave: true,
        });
      }
      const value = await tauriCodeLayoutStorage.store.get<string>(name);
      return value ?? null;
    } catch (error) {
      console.warn(
        "Failed to load from Tauri store, using localStorage fallback:",
        error,
      );
      return localStorage.getItem(name);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    if (!isBrowser) return;

    try {
      if (!tauriCodeLayoutStorage.store) {
        tauriCodeLayoutStorage.store = await Store.load("code-layout.json", {
          autoSave: true,
        });
      }
      await tauriCodeLayoutStorage.store.set(name, value);
      await tauriCodeLayoutStorage.store.save();
    } catch (error) {
      console.warn(
        "Failed to save to Tauri store, using localStorage fallback:",
        error,
      );
      localStorage.setItem(name, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (!isBrowser) return;

    try {
      if (!tauriCodeLayoutStorage.store) {
        tauriCodeLayoutStorage.store = await Store.load("code-layout.json", {
          autoSave: true,
        });
      }
      await tauriCodeLayoutStorage.store.delete(name);
      await tauriCodeLayoutStorage.store.save();
    } catch (error) {
      console.warn(
        "Failed to remove from Tauri store, using localStorage fallback:",
        error,
      );
      localStorage.removeItem(name);
    }
  },
};

export const useCodeLayoutStore = create<CodeLayoutStore>()(
  persist(
    (set) => ({
      ...defaultState,
      _hasHydrated: false,

      setPanelLayout: (layout) => set({ panelLayout: layout }),
      setAgentPanelCollapsed: (collapsed) =>
        set({ agentPanelCollapsed: collapsed }),
      setGitPanelCollapsed: (collapsed) =>
        set({ gitPanelCollapsed: collapsed }),
      setFileListView: (view) => set({ fileListView: view }),
      setDiffView: (view) => set({ diffView: view }),
      setExpandedSections: (sections) => set({ expandedSections: sections }),
      toggleSection: (section) =>
        set((state) => {
          const sections = state.expandedSections;
          return {
            expandedSections: sections.includes(section)
              ? sections.filter((s) => s !== section)
              : [...sections, section],
          };
        }),
      setSplitPosition: (position) => set({ splitPosition: position }),
      setLastActiveRepositoryId: (id) => set({ lastActiveRepositoryId: id }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "makima-code-layout",
      version: 1,
      storage: createJSONStorage(() => tauriCodeLayoutStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        panelLayout: state.panelLayout,
        agentPanelCollapsed: state.agentPanelCollapsed,
        gitPanelCollapsed: state.gitPanelCollapsed,
        fileListView: state.fileListView,
        diffView: state.diffView,
        expandedSections: state.expandedSections,
        splitPosition: state.splitPosition,
        lastActiveRepositoryId: state.lastActiveRepositoryId,
      }),
    },
  ),
);

// ============================================================================
// Atomic Selectors
// ============================================================================

export const useCodeLayoutHydrated = () =>
  useCodeLayoutStore((s) => s._hasHydrated);

export const useCodePanelLayout = () =>
  useCodeLayoutStore((s) => s.panelLayout);

export const useAgentPanelCollapsed = () =>
  useCodeLayoutStore((s) => s.agentPanelCollapsed);

export const useGitPanelCollapsed = () =>
  useCodeLayoutStore((s) => s.gitPanelCollapsed);

export const useFileListView = () => useCodeLayoutStore((s) => s.fileListView);

export const useDiffView = () => useCodeLayoutStore((s) => s.diffView);

export const useExpandedSections = () =>
  useCodeLayoutStore(useShallow((s) => s.expandedSections));

export const useSplitPosition = () =>
  useCodeLayoutStore((s) => s.splitPosition);

export const useLastActiveRepositoryId = () =>
  useCodeLayoutStore((s) => s.lastActiveRepositoryId);

// Actions selector (stable reference via useShallow)
export const useCodeLayoutActions = () =>
  useCodeLayoutStore(
    useShallow((s) => ({
      setPanelLayout: s.setPanelLayout,
      setAgentPanelCollapsed: s.setAgentPanelCollapsed,
      setGitPanelCollapsed: s.setGitPanelCollapsed,
      setFileListView: s.setFileListView,
      setDiffView: s.setDiffView,
      setExpandedSections: s.setExpandedSections,
      toggleSection: s.toggleSection,
      setSplitPosition: s.setSplitPosition,
      setLastActiveRepositoryId: s.setLastActiveRepositoryId,
    })),
  );
