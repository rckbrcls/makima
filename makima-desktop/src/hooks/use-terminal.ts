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

const ACK_INTERVAL_MS = 64;

function decodeBase64(b64: string, decoder: TextDecoder): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return decoder.decode(bytes, { stream: true });
}

export interface TerminalOptions {
  cwd?: string;
  cols?: number;
  rows?: number;
  command?: string;
  args?: Array<string>;
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

  // ACK tracking refs
  const lastReceivedSeqRef = useRef<number>(-1);
  const lastAckedSeqRef = useRef<number>(-1);
  const ackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Streaming UTF-8 decoder — holds incomplete multi-byte sequences between chunks
  const decoderRef = useRef<TextDecoder>(new TextDecoder());

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stopAckTimer = useCallback(() => {
    if (ackTimerRef.current !== null) {
      clearInterval(ackTimerRef.current);
      ackTimerRef.current = null;
    }
    // Send final flush ACK if there are unacked seqs
    const sid = sessionIdRef.current;
    if (sid && lastReceivedSeqRef.current > lastAckedSeqRef.current) {
      const seq = lastReceivedSeqRef.current;
      lastAckedSeqRef.current = seq;
      invoke("pty_ack", { sessionId: sid, seq }).catch(() => {
        // Session may already be gone — ignore
      });
    }
  }, []);

  const startAckTimer = useCallback(() => {
    stopAckTimer();
    ackTimerRef.current = setInterval(() => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      const received = lastReceivedSeqRef.current;
      if (received > lastAckedSeqRef.current) {
        lastAckedSeqRef.current = received;
        invoke("pty_ack", { sessionId: sid, seq: received }).catch(() => {
          // Session may already be gone — ignore
        });
      }
    }, ACK_INTERVAL_MS);
  }, [stopAckTimer]);

  const spawn = useCallback(
    async (
      cwd?: string,
      cols?: number,
      rows?: number,
      command?: string,
      args?: Array<string>,
    ): Promise<PtySession | null> => {
      // Clean up previous session if exists
      unlistenOutputRef.current?.();
      unlistenExitRef.current?.();
      stopAckTimer();

      setError(null);

      // Reset ACK tracking and decoder for new session
      lastReceivedSeqRef.current = -1;
      lastAckedSeqRef.current = -1;
      decoderRef.current = new TextDecoder();

      // Generate session ID on frontend
      const sessionId = `pty-${Date.now()}`;
      sessionIdRef.current = sessionId;

      try {
        // Set up event listeners BEFORE spawning to avoid race condition
        unlistenOutputRef.current = await listen<PtyOutputPayload>(
          "pty:output",
          (event) => {
            if (event.payload.sessionId === sessionId) {
              lastReceivedSeqRef.current = event.payload.seq;
              const decoded = decodeBase64(
                event.payload.data,
                decoderRef.current,
              );
              optionsRef.current.onOutput?.(decoded);
            }
          },
        );

        unlistenExitRef.current = await listen<PtyExitPayload>(
          "pty:exit",
          (event) => {
            if (event.payload.sessionId === sessionId) {
              stopAckTimer();
              sessionIdRef.current = null;
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
          command: command ?? optionsRef.current.command,
          args: args ?? optionsRef.current.args,
        });
        const ptySession = mapPtySession(result);
        setSession(ptySession);
        setIsConnected(true);
        startAckTimer();

        return ptySession;
      } catch (err) {
        // Clean up listeners on error
        unlistenOutputRef.current?.();
        unlistenExitRef.current?.();
        unlistenOutputRef.current = null;
        unlistenExitRef.current = null;
        stopAckTimer();
        sessionIdRef.current = null;
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [startAckTimer, stopAckTimer],
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
      stopAckTimer();
      sessionIdRef.current = null;
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
  }, [stopAckTimer]);

  // Cleanup on unmount - only unlisten events, PTY process managed explicitly via kill()
  useEffect(() => {
    return () => {
      unlistenOutputRef.current?.();
      unlistenExitRef.current?.();
      stopAckTimer();
    };
  }, [stopAckTimer]);

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
