import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Agent, Session } from "@/components/agents/types";

// ============================================================================
// UI Store - Reactive UI state managed by Zustand
// ============================================================================

interface UIState {
  // Approval drawer
  approvalDrawerOpen: boolean;

  // Selected entities
  selectedAgent: Agent | null;
  selectedSession: Session | null;

  // Mobile sidebar
  mobileSidebarOpen: boolean;

  // Selected repository (for repos page)
  selectedRepo: string | null;

  // Create dialogs
  // Create dialogs
  createAgentDialogOpen: boolean;

  // Terminal drawer
  terminalDrawerOpen: boolean;
}

interface UIActions {
  // Approval drawer
  openApprovalDrawer: () => void;
  closeApprovalDrawer: () => void;
  setApprovalDrawerOpen: (open: boolean) => void;

  // Agent selection
  selectAgent: (agent: Agent | null) => void;

  // Session selection
  selectSession: (session: Session | null) => void;

  // Mobile sidebar
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;

  // Repository selection
  selectRepo: (repo: string | null) => void;

  // Create agent dialog
  openCreateAgentDialog: () => void;
  closeCreateAgentDialog: () => void;
  setCreateAgentDialogOpen: (open: boolean) => void;

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
  selectedAgent: null,
  selectedSession: null,
  mobileSidebarOpen: false,
  selectedRepo: null,
  createAgentDialogOpen: false,
  terminalDrawerOpen: false,
};

export const useUIStore = create<UIStore>((set) => ({
  ...initialState,

  // Approval drawer
  openApprovalDrawer: () => set({ approvalDrawerOpen: true }),
  closeApprovalDrawer: () => set({ approvalDrawerOpen: false }),
  setApprovalDrawerOpen: (open) => set({ approvalDrawerOpen: open }),

  // Agent selection
  selectAgent: (agent) => set({ selectedAgent: agent }),

  // Session selection
  selectSession: (session) => set({ selectedSession: session }),

  // Mobile sidebar
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // Repository selection
  selectRepo: (repo) => set({ selectedRepo: repo }),

  // Create agent dialog
  openCreateAgentDialog: () => set({ createAgentDialogOpen: true }),
  closeCreateAgentDialog: () => set({ createAgentDialogOpen: false }),
  setCreateAgentDialogOpen: (open) => set({ createAgentDialogOpen: open }),

  // Terminal drawer
  openTerminalDrawer: () => set({ terminalDrawerOpen: true }),
  closeTerminalDrawer: () => set({ terminalDrawerOpen: false }),
  setTerminalDrawerOpen: (open) => set({ terminalDrawerOpen: open }),

  // Reset all selections
  resetSelections: () =>
    set({
      selectedAgent: null,
      selectedSession: null,
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

export const useCreateAgentDialogOpen = () =>
  useUIStore((s) => s.createAgentDialogOpen);

export const useMobileSidebarOpen = () =>
  useUIStore((s) => s.mobileSidebarOpen);

// Selection selectors
export const useSelectedAgent = () => useUIStore((s) => s.selectedAgent);

export const useSelectedSession = () => useUIStore((s) => s.selectedSession);

export const useSelectedRepo = () => useUIStore((s) => s.selectedRepo);

// Derived selectors
export const useHasSelectedAgent = () =>
  useUIStore((s) => s.selectedAgent !== null);

export const useHasSelectedSession = () =>
  useUIStore((s) => s.selectedSession !== null);

export const useHasSelectedRepo = () =>
  useUIStore((s) => s.selectedRepo !== null);

// Actions selector (stable reference)
export const useUIActions = () =>
  useUIStore(
    useShallow((s) => ({
      openApprovalDrawer: s.openApprovalDrawer,
      closeApprovalDrawer: s.closeApprovalDrawer,
      setApprovalDrawerOpen: s.setApprovalDrawerOpen,
      selectAgent: s.selectAgent,
      selectSession: s.selectSession,
      openMobileSidebar: s.openMobileSidebar,
      closeMobileSidebar: s.closeMobileSidebar,
      setMobileSidebarOpen: s.setMobileSidebarOpen,
      selectRepo: s.selectRepo,
      openCreateAgentDialog: s.openCreateAgentDialog,
      closeCreateAgentDialog: s.closeCreateAgentDialog,
      setCreateAgentDialogOpen: s.setCreateAgentDialogOpen,
      openTerminalDrawer: s.openTerminalDrawer,
      closeTerminalDrawer: s.closeTerminalDrawer,
      setTerminalDrawerOpen: s.setTerminalDrawerOpen,
      resetSelections: s.resetSelections,
    })),
  );
