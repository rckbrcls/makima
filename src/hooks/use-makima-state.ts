import { useCommandStore } from "@/stores/command-store";

// ============================================================================
// Hook
// ============================================================================

export function useMakimaState() {
  const store = useCommandStore();

  return {
    state: store,
    refreshState: store.refreshState,
    runCommand: store.runCommand,
    stopCommand: store.stopCommand,
    addRepository: store.addRepository,
    addCommand: store.addCommand,
    updateCommand: store.updateCommand,
    deleteCommand: store.deleteCommand,
    deleteRepository: store.deleteRepository,
    getExecutionLogs: store.getExecutionLogs,
  };
}
