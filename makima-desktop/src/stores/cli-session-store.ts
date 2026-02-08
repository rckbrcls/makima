import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { AiCliInfo, CliSession } from "@/lib/code-types";
import { createTauriStorage } from "@/lib/tauri-storage";

// ============================================================================
// CLI Session Store - Ephemeral state for AI CLI sessions
// ============================================================================

interface CliSessionState {
  availableClis: Array<AiCliInfo>;
  selectedCliCommand: string | null;
  sessions: Map<string, CliSession>;
  activeRepositoryId: string | null;
  activeSessionId: string | null;
  spawningSessions: Set<string>;

  // Hydration state
  _hasHydrated: boolean;
}

interface CliSessionActions {
  setAvailableClis: (clis: Array<AiCliInfo>) => void;
  setSelectedCliCommand: (command: string | null) => void;
  setActiveRepositoryId: (id: string | null) => void;
  setActiveSessionId: (id: string | null) => void;
  createSession: (session: CliSession) => void;
  updateSessionStatus: (
    sessionId: string,
    status: CliSession["status"],
    exitCode?: number,
  ) => void;
  updateSessionPty: (sessionId: string, ptySessionId: string) => void;
  removeSession: (sessionId: string) => void;
  resetSession: (sessionId: string) => void;
  updateSessionResumeId: (sessionId: string, resumeSessionId: string) => void;
  updateSessionCli: (
    sessionId: string,
    cliCommand: string,
    cliName: string,
  ) => void;
  hydrateFromDb: (sessions: Array<CliSession>) => void;
  addSpawning: (sessionId: string) => void;
  removeSpawning: (sessionId: string) => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export type CliSessionStore = CliSessionState & CliSessionActions;

const initialState: Omit<CliSessionState, "_hasHydrated"> = {
  availableClis: [],
  selectedCliCommand: null,
  sessions: new Map(),
  activeRepositoryId: null,
  activeSessionId: null,
  spawningSessions: new Set(),
};

const tauriCliSessionStorage = createTauriStorage("cli-session.json");

export const useCliSessionStore = create<CliSessionStore>()(
  persist(
    (set) => ({
      ...initialState,
      _hasHydrated: false,

      setAvailableClis: (clis) => {
        const installed = clis.filter((c) => c.installed);
        set((state) => ({
          availableClis: clis,
          selectedCliCommand:
            state.selectedCliCommand &&
            installed.some((c) => c.command === state.selectedCliCommand)
              ? state.selectedCliCommand
              : installed[0]?.command || null,
        }));
      },

  setSelectedCliCommand: (command) => set({ selectedCliCommand: command }),

  setActiveRepositoryId: (id) => set({ activeRepositoryId: id }),

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  createSession: (session) =>
    set((state) => {
      const next = new Map(state.sessions);
      next.set(session.id, session);
      return { sessions: next };
    }),

  updateSessionStatus: (sessionId, status, exitCode) =>
    set((state) => {
      const existing = state.sessions.get(sessionId);
      if (!existing) return state;
      const next = new Map(state.sessions);
      next.set(sessionId, { ...existing, status, exitCode });
      return { sessions: next };
    }),

  updateSessionPty: (sessionId, ptySessionId) =>
    set((state) => {
      const existing = state.sessions.get(sessionId);
      if (!existing) return state;
      const next = new Map(state.sessions);
      next.set(sessionId, { ...existing, ptySessionId, status: "running" });
      return { sessions: next };
    }),

  removeSession: (sessionId) =>
    set((state) => {
      const next = new Map(state.sessions);
      next.delete(sessionId);
      const resetActive =
        state.activeSessionId === sessionId ? { activeSessionId: null } : {};
      return { sessions: next, ...resetActive };
    }),

  resetSession: (sessionId) =>
    set((state) => {
      const existing = state.sessions.get(sessionId);
      if (!existing) return state;
      // No-op if already idle or running
      if (existing.status === "idle" || existing.status === "running")
        return state;
      const next = new Map(state.sessions);
      next.set(sessionId, {
        ...existing,
        status: "idle",
        ptySessionId: null,
        exitCode: undefined,
        startedAt: Date.now(),
      });
      return { sessions: next };
    }),

  updateSessionResumeId: (sessionId, resumeSessionId) =>
    set((state) => {
      const existing = state.sessions.get(sessionId);
      if (!existing) return state;
      const next = new Map(state.sessions);
      next.set(sessionId, { ...existing, resumeSessionId });
      return { sessions: next };
    }),

  updateSessionCli: (sessionId, cliCommand, cliName) =>
    set((state) => {
      const existing = state.sessions.get(sessionId);
      if (!existing) return state;
      const next = new Map(state.sessions);
      next.set(sessionId, { ...existing, cliCommand, cliName });
      return { sessions: next };
    }),

  hydrateFromDb: (sessions) =>
    set((state) => {
      const next = new Map(state.sessions);
      for (const session of sessions) {
        // Only add sessions not already in the store (don't overwrite running sessions)
        if (!next.has(session.id)) {
          next.set(session.id, session);
        }
      }
      return { sessions: next };
    }),

  addSpawning: (sessionId) =>
    set((state) => {
      const next = new Set(state.spawningSessions);
      next.add(sessionId);
      return { spawningSessions: next };
    }),

  removeSpawning: (sessionId) =>
    set((state) => {
      const next = new Set(state.spawningSessions);
      next.delete(sessionId);
      return { spawningSessions: next };
    }),

  // Hydration
  setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "makima-cli-session",
      storage: createJSONStorage(() => tauriCliSessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        selectedCliCommand: state.selectedCliCommand,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);

// ============================================================================
// Atomic Selectors
// ============================================================================

// Hydration selector
export const useCliSessionHydrated = () =>
  useCliSessionStore((s) => s._hasHydrated);

export const useAvailableClis = () =>
  useCliSessionStore((s) => s.availableClis);

export const useInstalledClis = () =>
  useCliSessionStore(
    useShallow((s) => s.availableClis.filter((c) => c.installed)),
  );

export const useSelectedCliCommand = () =>
  useCliSessionStore((s) => s.selectedCliCommand);

export const useCliActiveRepositoryId = () =>
  useCliSessionStore((s) => s.activeRepositoryId);

export const useCliActiveSessionId = () =>
  useCliSessionStore((s) => s.activeSessionId);

export const useCliActiveSession = () =>
  useCliSessionStore((s) => {
    if (!s.activeSessionId) return null;
    return s.sessions.get(s.activeSessionId) ?? null;
  });

export const useCliSessions = () => useCliSessionStore((s) => s.sessions);

export const useCliGitPollInterval = () =>
  useCliSessionStore((s) => {
    if (!s.activeRepositoryId) return 5000;
    for (const session of s.sessions.values()) {
      if (
        session.repositoryId === s.activeRepositoryId &&
        session.status === "running"
      ) {
        return 1000;
      }
    }
    return 5000;
  });

export const useCliShouldSpawn = () =>
  useCliSessionStore((s) => {
    if (!s.activeSessionId) return false;
    return s.spawningSessions.has(s.activeSessionId);
  });

// Per-session selectors (parameterized — return primitives, no useShallow needed)
export const useCliSession = (sessionId: string) =>
  useCliSessionStore((s) => s.sessions.get(sessionId) ?? null);

export const useCliShouldSpawnSession = (sessionId: string) =>
  useCliSessionStore((s) => s.spawningSessions.has(sessionId));

// Actions selector (stable reference)
export const useCliSessionActions = () =>
  useCliSessionStore(
    useShallow((s) => ({
      setAvailableClis: s.setAvailableClis,
      setSelectedCliCommand: s.setSelectedCliCommand,
      setActiveRepositoryId: s.setActiveRepositoryId,
      setActiveSessionId: s.setActiveSessionId,
      createSession: s.createSession,
      updateSessionStatus: s.updateSessionStatus,
      updateSessionPty: s.updateSessionPty,
      removeSession: s.removeSession,
      resetSession: s.resetSession,
      updateSessionResumeId: s.updateSessionResumeId,
      updateSessionCli: s.updateSessionCli,
      hydrateFromDb: s.hydrateFromDb,
      addSpawning: s.addSpawning,
      removeSpawning: s.removeSpawning,
    })),
  );
