import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { createTauriStorage } from "@/lib/tauri-storage";

// ============================================================================
// UI Store - Reactive UI state managed by Zustand
// ============================================================================

interface UIState {
  // Active tab (persisted)
  activeTabId: number;

  // Approval drawer
  approvalDrawerOpen: boolean;

  // Mobile sidebar
  mobileSidebarOpen: boolean;

  // Selected repository (for repos page)
  selectedRepo: string | null;

  // Terminal drawer
  terminalDrawerOpen: boolean;

  // Hydration state
  _hasHydrated: boolean;
}

interface UIActions {
  // Active tab
  setActiveTabId: (id: number) => void;

  // Approval drawer
  openApprovalDrawer: () => void;
  closeApprovalDrawer: () => void;
  setApprovalDrawerOpen: (open: boolean) => void;

  // Mobile sidebar
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;

  // Repository selection
  selectRepo: (repo: string | null) => void;

  // Terminal drawer
  openTerminalDrawer: () => void;
  closeTerminalDrawer: () => void;
  setTerminalDrawerOpen: (open: boolean) => void;

  // Reset all selections
  resetSelections: () => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export type UIStore = UIState & UIActions;

const initialState: Omit<UIState, "_hasHydrated"> = {
  activeTabId: 0,
  approvalDrawerOpen: false,
  mobileSidebarOpen: false,
  selectedRepo: null,
  terminalDrawerOpen: false,
};

const tauriUIStorage = createTauriStorage("ui-state.json");

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,
      _hasHydrated: false,

      // Active tab
      setActiveTabId: (id) => set({ activeTabId: id }),

      // Approval drawer
      openApprovalDrawer: () => set({ approvalDrawerOpen: true }),
      closeApprovalDrawer: () => set({ approvalDrawerOpen: false }),
      setApprovalDrawerOpen: (open) => set({ approvalDrawerOpen: open }),

      // Mobile sidebar
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      // Repository selection
      selectRepo: (repo) => set({ selectedRepo: repo }),

      // Terminal drawer
      openTerminalDrawer: () => set({ terminalDrawerOpen: true }),
      closeTerminalDrawer: () => set({ terminalDrawerOpen: false }),
      setTerminalDrawerOpen: (open) => set({ terminalDrawerOpen: open }),

      // Reset all selections
      resetSelections: () =>
        set({
          selectedRepo: null,
        }),

      // Hydration
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "makima-ui-state",
      storage: createJSONStorage(() => tauriUIStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        activeTabId: state.activeTabId,
      }),
    },
  ),
);

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// Hydration selector
export const useUIHydrated = () => useUIStore((s) => s._hasHydrated);

// Active tab selector
export const useActiveTabId = () => useUIStore((s) => s.activeTabId);

// Drawer selectors
export const useApprovalDrawerOpen = () =>
  useUIStore((s) => s.approvalDrawerOpen);

export const useTerminalDrawerOpen = () =>
  useUIStore((s) => s.terminalDrawerOpen);

export const useMobileSidebarOpen = () =>
  useUIStore((s) => s.mobileSidebarOpen);

// Selection selectors
export const useSelectedRepo = () => useUIStore((s) => s.selectedRepo);

// Derived selectors
export const useHasSelectedRepo = () =>
  useUIStore((s) => s.selectedRepo !== null);

// Actions selector (stable reference)
export const useUIActions = () =>
  useUIStore(
    useShallow((s) => ({
      setActiveTabId: s.setActiveTabId,
      openApprovalDrawer: s.openApprovalDrawer,
      closeApprovalDrawer: s.closeApprovalDrawer,
      setApprovalDrawerOpen: s.setApprovalDrawerOpen,
      openMobileSidebar: s.openMobileSidebar,
      closeMobileSidebar: s.closeMobileSidebar,
      setMobileSidebarOpen: s.setMobileSidebarOpen,
      selectRepo: s.selectRepo,
      openTerminalDrawer: s.openTerminalDrawer,
      closeTerminalDrawer: s.closeTerminalDrawer,
      setTerminalDrawerOpen: s.setTerminalDrawerOpen,
      resetSelections: s.resetSelections,
    })),
  );
