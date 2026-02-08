import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import type { CliSessionDb } from "@/lib/code-types";
import { mapCliSessionFromDb } from "@/lib/code-types";
import { useCliSessionStore } from "@/stores";

export function useCliSessionsDb() {
  const hydrateFromDb = useCliSessionStore((s) => s.hydrateFromDb);

  const loadSessions = useCallback(async () => {
    try {
      const rows = await invoke<Array<CliSessionDb>>("db_list_cli_sessions");
      const sessions = rows.map(mapCliSessionFromDb);
      // Force all loaded sessions to exited — PTY is dead after restart
      const exitedSessions = sessions.map((s) => ({
        ...s,
        status: "exited" as const,
        ptySessionId: null,
      }));
      hydrateFromDb(exitedSessions);
    } catch (err) {
      console.error("[use-cli-sessions] Failed to load sessions:", err);
    }
  }, [hydrateFromDb]);

  const createSessionDb = useCallback(
    async (
      id: string,
      repositoryId: string,
      cliName: string | null,
      cliCommand: string | null,
    ) => {
      try {
        await invoke("db_create_cli_session", {
          id,
          repositoryId,
          cliName,
          cliCommand,
        });
      } catch (err) {
        console.error("[use-cli-sessions] Failed to create session:", err);
      }
    },
    [],
  );

  const updateSessionDb = useCallback(
    async (
      id: string,
      updates: {
        status?: string;
        exitCode?: number;
        resumeSessionId?: string;
        cliName?: string;
        cliCommand?: string;
      },
    ) => {
      try {
        await invoke("db_update_cli_session", { id, ...updates });
      } catch (err) {
        console.error("[use-cli-sessions] Failed to update session:", err);
      }
    },
    [],
  );

  const deleteSessionDb = useCallback(async (id: string) => {
    try {
      await invoke("db_delete_cli_session", { id });
    } catch (err) {
      console.error("[use-cli-sessions] Failed to delete session:", err);
    }
  }, []);

  return {
    loadSessions,
    createSessionDb,
    updateSessionDb,
    deleteSessionDb,
  };
}
