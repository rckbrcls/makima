import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

// ============================================================================
// UI Store - Reactive UI state managed by Zustand
// ============================================================================

interface UIState {
  // Approval drawer
  approvalDrawerOpen: boolean;

  // Mobile sidebar
  mobileSidebarOpen: boolean;

  // Selected repository (for repos page)
  selectedRepo: string | null;

  // Terminal drawer
  terminalDrawerOpen: boolean;
}

interface UIActions {
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
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  approvalDrawerOpen: false,
  mobileSidebarOpen: false,
  selectedRepo: null,
  terminalDrawerOpen: false,
};

export const useUIStore = create<UIStore>((set) => ({
  ...initialState,

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
}));

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

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
