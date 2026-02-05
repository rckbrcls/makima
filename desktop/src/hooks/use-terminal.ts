import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type {
  PtyExitPayload,
  PtyOutputPayload,
  PtySession,
  PtySessionDb,
} from "@/lib/code-types";
import { mapPtySession } from "@/lib/code-types";

export interface TerminalOptions {
  cwd?: string;
  cols?: number;
  rows?: number;
  onOutput?: (data: string) => void;
  onExit?: (exitCode?: number) => void;
}

export function useTerminal(options: TerminalOptions = {}) {
  const [session, setSession] = useState<PtySession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlistenOutputRef = useRef<UnlistenFn | null>(null);
  const unlistenExitRef = useRef<UnlistenFn | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const spawn = useCallback(
    async (
      cwd?: string,
      cols?: number,
      rows?: number,
    ): Promise<PtySession | null> => {
      // Clean up previous session if exists
      unlistenOutputRef.current?.();
      unlistenExitRef.current?.();

      setError(null);

      // Generate session ID on frontend
      const sessionId = `pty-${Date.now()}`;

      try {
        // Set up event listeners BEFORE spawning to avoid race condition
        unlistenOutputRef.current = await listen<PtyOutputPayload>(
          "pty:output",
          (event) => {
            if (event.payload.sessionId === sessionId) {
              optionsRef.current.onOutput?.(event.payload.data);
            }
          },
        );

        unlistenExitRef.current = await listen<PtyExitPayload>(
          "pty:exit",
          (event) => {
            if (event.payload.sessionId === sessionId) {
              setIsConnected(false);
              setSession(null);
              optionsRef.current.onExit?.(event.payload.exitCode ?? undefined);
            }
          },
        );

        // Now spawn the PTY with the known session ID
        const result = await invoke<PtySessionDb>("pty_spawn", {
          sessionId: sessionId,
          cwd: cwd ?? optionsRef.current.cwd,
          cols: cols ?? optionsRef.current.cols ?? 80,
          rows: rows ?? optionsRef.current.rows ?? 24,
        });
        const ptySession = mapPtySession(result);
        setSession(ptySession);
        setIsConnected(true);

        return ptySession;
      } catch (err) {
        // Clean up listeners on error
        unlistenOutputRef.current?.();
        unlistenExitRef.current?.();
        unlistenOutputRef.current = null;
        unlistenExitRef.current = null;
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [],
  );

  // Keep session ref for stable callbacks and cleanup
  const sessionRef = useRef<PtySession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const write = useCallback(async (data: string): Promise<boolean> => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return false;
    }
    try {
      await invoke("pty_write", {
        sessionId: currentSession.sessionId,
        data,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, []);

  const resize = useCallback(
    async (cols: number, rows: number): Promise<boolean> => {
      const currentSession = sessionRef.current;
      if (!currentSession) return false;
      try {
        await invoke("pty_resize", {
          sessionId: currentSession.sessionId,
          cols,
          rows,
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [],
  );

  const kill = useCallback(async (): Promise<boolean> => {
    const currentSession = sessionRef.current;
    if (!currentSession) return false;
    try {
      await invoke("pty_kill", {
        sessionId: currentSession.sessionId,
      });
      setSession(null);
      setIsConnected(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, []);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      unlistenOutputRef.current?.();
      unlistenExitRef.current?.();
      if (sessionRef.current) {
        invoke("pty_kill", { sessionId: sessionRef.current.sessionId }).catch(
          () => {},
        );
      }
    };
  }, []); // Empty deps - only runs on unmount

  return {
    session,
    isConnected,
    error,
    spawn,
    write,
    resize,
    kill,
  };
}
