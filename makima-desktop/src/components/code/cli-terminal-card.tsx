import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play, Plus, RotateCcw, Square } from "lucide-react";
import type { FitAddon } from "@xterm/addon-fit";
import type { Terminal } from "@xterm/xterm";
import { useTerminal } from "@/hooks/use-terminal";
import { buildResumeArgs, extractResumeId, stripAnsi } from "@/lib/cli-resume";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Blob3D } from "@/components/visuals/blob-3d";
import { Typewriter } from "@/components/ui/typewriter";
import {
  useCliSession,
  useCliSessionActions,
  useCliSessionStore,
  useCliShouldSpawnSession,
  useInstalledClis,
  useSelectedCliCommand,
} from "@/stores";

// Debounce utility for resize handling
function debounce<T extends (...args: Array<unknown>) => void>(
  fn: T,
  ms: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
}

const CLI_SUGGESTIONS = [
  "Select a CLI and hit Start",
  "Run AI agents on your codebase",
  "Execute commands in real time",
  "Manage multiple sessions at once",
];

// ============================================================================
// Empty State
// ============================================================================

export function CliEmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-[280px] w-full max-w-2xl">
        <Blob3D className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Typewriter
            className="pointer-events-auto max-w-xl px-4 text-center font-serif text-2xl"
            baseText="Ready to code. "
            delay={0.5}
            textsDelay={2}
            texts={CLI_SUGGESTIONS}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Bottom Action Bar
// ============================================================================

interface CliBottomBarProps {
  sessionId: string;
  isConnected: boolean;
  onStop?: () => void;
  onRestart?: () => void;
  onNewSession?: () => void;
}

function CliBottomBar({
  sessionId,
  isConnected,
  onStop,
  onRestart,
  onNewSession,
}: CliBottomBarProps) {
  const installedClis = useInstalledClis();
  const selectedCommand = useSelectedCliCommand();
  const session = useCliSession(sessionId);
  const { setSelectedCliCommand, resetSession, addSpawning, updateSessionCli } =
    useCliSessionActions();

  const isRunning = session?.status === "running";
  const isExited = session?.status === "exited";
  const hasError = session?.status === "error";

  // CLI is locked once assigned to the session (regardless of status)
  const isCliLocked = Boolean(session?.cliCommand);

  // Display the session's CLI when assigned, otherwise the global selector
  const displayCommand = session?.cliCommand ?? selectedCommand;

  const handleStart = useCallback(() => {
    if (!session) return;

    // Session already has a CLI (exited/restart) — use stored CLI
    if (session.cliCommand) {
      resetSession(sessionId);
      addSpawning(sessionId);
      return;
    }

    // Fresh idle session without CLI — assign from global selector
    if (selectedCommand) {
      const cli = installedClis.find((c) => c.command === selectedCommand);
      if (cli) {
        updateSessionCli(sessionId, selectedCommand, cli.name);
        invoke("db_update_cli_session", {
          id: sessionId,
          cliCommand: selectedCommand,
          cliName: cli.name,
        }).catch(() => {});
      }
    }
    addSpawning(sessionId);
  }, [
    sessionId,
    session,
    selectedCommand,
    installedClis,
    resetSession,
    addSpawning,
    updateSessionCli,
  ]);

  return (
    <div className="border-border flex items-center gap-2 border-t px-3 py-1.5">
      {/* Connection indicator */}
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          isConnected ? "bg-emerald-400" : "bg-muted-foreground",
        )}
      />

      {/* CLI Selector */}
      <select
        value={displayCommand ?? ""}
        onChange={(e) => setSelectedCliCommand(e.target.value || null)}
        disabled={isCliLocked}
        className="bg-input text-foreground border-border h-6 rounded-md border px-2 text-xs focus:outline-none"
      >
        {installedClis.length === 0 && (
          <option value="">No CLIs detected</option>
        )}
        {installedClis.map((cli) => (
          <option key={cli.command} value={cli.command}>
            {cli.name}
            {cli.version ? ` (${cli.version})` : ""}
          </option>
        ))}
      </select>

      {/* Session status badge */}
      {session && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            isRunning && "border-emerald-500 bg-emerald-600 text-emerald-950",
            isExited &&
              "border-secondary bg-secondary text-secondary-foreground",
            hasError &&
              "border-destructive bg-destructive text-destructive-foreground",
          )}
        >
          {session.status}
        </Badge>
      )}

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button
            variant="default"
            size="xs"
            onClick={handleStart}
            disabled={!session?.cliCommand && !selectedCommand}
          >
            <Play className="mr-1 size-3" />
            Start
          </Button>
        ) : (
          <>
            {onNewSession && (
              <Button
                variant="outline"
                size="xs"
                onClick={onNewSession}
                disabled={!selectedCommand}
              >
                <Plus className="mr-1 size-3" />
                New
              </Button>
            )}
            <Button variant="outline" size="xs" onClick={onStop}>
              <Square className="mr-1 size-3" />
              Stop
            </Button>
            <Button variant="outline" size="xs" onClick={onRestart}>
              <RotateCcw className="mr-1 size-3" />
              Restart
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Terminal Card
// ============================================================================

interface CliTerminalCardProps {
  sessionId: string;
  isVisible: boolean;
  cwd?: string;
  onNewSession?: () => void;
  className?: string;
}

export const CliTerminalCard = memo(function CliTerminalCard({
  sessionId,
  isVisible,
  cwd,
  onNewSession,
  className,
}: CliTerminalCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Per-session state from store
  const session = useCliSession(sessionId);
  const shouldSpawn = useCliShouldSpawnSession(sessionId);
  const {
    removeSpawning,
    updateSessionPty,
    updateSessionStatus,
    updateSessionResumeId,
  } = useCliSessionActions();

  // Output buffer for resume ID detection (ref, no re-renders)
  const outputBufferRef = useRef("");
  const MAX_BUFFER_SIZE = 2048;

  // Store cwd in ref so spawn effect doesn't depend on it
  const cwdRef = useRef(cwd);
  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);

  // Store sessionId in ref for callbacks that need latest value
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Store session in ref so spawn effect reads latest without depending on it
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Resume args derived from session
  const resumeArgs = useMemo(() => {
    if (!session || !session.cliCommand) return undefined;
    return buildResumeArgs(session.cliCommand, session.resumeSessionId);
  }, [session?.cliCommand, session?.resumeSessionId]);
  const resumeArgsRef = useRef(resumeArgs);
  useEffect(() => {
    resumeArgsRef.current = resumeArgs;
  }, [resumeArgs]);

  // Store actions in refs for stable callbacks
  const removeSpawningRef = useRef(removeSpawning);
  const updateSessionPtyRef = useRef(updateSessionPty);
  const updateSessionStatusRef = useRef(updateSessionStatus);
  const updateSessionResumeIdRef = useRef(updateSessionResumeId);
  useEffect(() => {
    removeSpawningRef.current = removeSpawning;
    updateSessionPtyRef.current = updateSessionPty;
    updateSessionStatusRef.current = updateSessionStatus;
    updateSessionResumeIdRef.current = updateSessionResumeId;
  }, [
    removeSpawning,
    updateSessionPty,
    updateSessionStatus,
    updateSessionResumeId,
  ]);

  const { spawn, write, resize, kill, isConnected, error } = useTerminal({
    onOutput: useCallback((data: string) => {
      terminalRef.current?.write(data);
      const clean = stripAnsi(data);
      outputBufferRef.current += clean;
      if (outputBufferRef.current.length > MAX_BUFFER_SIZE) {
        outputBufferRef.current =
          outputBufferRef.current.slice(-MAX_BUFFER_SIZE);
      }
      // Continuous detection: capture resume ID as soon as it appears in output
      if (outputBufferRef.current.includes("resume")) {
        const resumeId = extractResumeId(outputBufferRef.current);
        if (resumeId) {
          console.log("[cli-resume] onOutput captured:", resumeId);
          updateSessionResumeIdRef.current(sessionIdRef.current, resumeId);
        }
      }
    }, []),
    onExit: useCallback((exitCode?: number) => {
      terminalRef.current?.writeln("\r\n[Process exited]");
      const resumeId = extractResumeId(outputBufferRef.current);
      if (resumeId) {
        console.log("[cli-resume] onExit captured:", resumeId);
        updateSessionResumeIdRef.current(sessionIdRef.current, resumeId);
      }
      removeSpawningRef.current(sessionIdRef.current);
      updateSessionStatusRef.current(sessionIdRef.current, "exited", exitCode);
      // Persist to DB
      invoke("db_update_cli_session", {
        id: sessionIdRef.current,
        status: "exited",
        exitCode: exitCode ?? null,
        resumeSessionId: resumeId ?? null,
      }).catch((err) =>
        console.error("[cli-terminal] db_update on exit:", err),
      );
    }, []),
  });

  // Store spawn/write/kill in refs to avoid effect dependencies
  const spawnRef = useRef(spawn);
  const writeRef = useRef(write);
  const killRef = useRef(kill);

  useEffect(() => {
    spawnRef.current = spawn;
    writeRef.current = write;
    killRef.current = kill;
  }, [spawn, write, kill]);

  // Graceful shutdown: send Ctrl+C twice, poll for resume ID, then kill PTY
  const gracefulShutdown = useCallback(async () => {
    // Send first Ctrl+C
    await writeRef.current("\x03");
    // Wait 150ms then send second Ctrl+C
    await new Promise((r) => setTimeout(r, 150));
    await writeRef.current("\x03");
    // Wait for CLI to print resume instructions
    await new Promise((r) => setTimeout(r, 500));
    // Check output buffer for resume ID
    const resumeId = extractResumeId(outputBufferRef.current);
    if (resumeId) {
      console.log("[cli-resume] graceful shutdown captured:", resumeId);
      updateSessionResumeIdRef.current(sessionIdRef.current, resumeId);
    }
    // Kill the PTY process
    await killRef.current();
    removeSpawningRef.current(sessionIdRef.current);
    updateSessionStatusRef.current(sessionIdRef.current, "exited");
    // Persist to DB
    invoke("db_update_cli_session", {
      id: sessionIdRef.current,
      status: "exited",
      resumeSessionId: resumeId ?? null,
    }).catch((err) =>
      console.error("[cli-terminal] db_update on shutdown:", err),
    );
  }, []);

  const handleGracefulStop = useCallback(() => {
    gracefulShutdown();
  }, [gracefulShutdown]);

  const handleGracefulRestart = useCallback(() => {
    gracefulShutdown().then(() => {
      setTimeout(() => {
        const sid = sessionIdRef.current;
        const store = useCliSessionStore.getState();
        store.resetSession(sid);
        store.addSpawning(sid);
      }, 200);
    });
  }, [gracefulShutdown]);

  // Initialize xterm (just the terminal UI, no spawning)
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    const initTerminal = async () => {
      try {
        const [xtermModule, fitAddonModule, webLinksAddonModule] =
          await Promise.all([
            import("@xterm/xterm"),
            import("@xterm/addon-fit"),
            import("@xterm/addon-web-links"),
          ]);

        await import("@xterm/xterm/css/xterm.css");

        const { Terminal } = xtermModule;
        const { FitAddon } = fitAddonModule;
        const { WebLinksAddon } = webLinksAddonModule;

        if (!containerRef.current || isInitializedRef.current) return;

        // Read theme colors from CSS variables so terminal matches bg-background
        const rootStyles = getComputedStyle(document.documentElement);
        const bg = rootStyles.getPropertyValue("--background").trim();
        const fg = rootStyles.getPropertyValue("--foreground").trim();

        const terminal = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "JetBrains Mono Variable, Menlo, Monaco, monospace",
          theme: {
            background: bg,
            foreground: fg,
            cursor: fg,
            cursorAccent: bg,
            selectionBackground: "#3f3f46",
            black: "#18181b",
            red: "#f87171",
            green: "#4ade80",
            yellow: "#facc15",
            blue: "#60a5fa",
            magenta: "#c084fc",
            cyan: "#22d3ee",
            white: "#e4e4e7",
            brightBlack: "#52525b",
            brightRed: "#fca5a5",
            brightGreen: "#86efac",
            brightYellow: "#fde047",
            brightBlue: "#93c5fd",
            brightMagenta: "#d8b4fe",
            brightCyan: "#67e8f9",
            brightWhite: "#fafafa",
          },
          scrollback: 5000,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.open(containerRef.current);

        requestAnimationFrame(() => {
          fitAddon.fit();
        });

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;
        isInitializedRef.current = true;
        setIsLoaded(true);

        // Handle user input
        terminal.onData((data) => {
          writeRef.current(data);
        });
      } catch (err) {
        console.error("Failed to load terminal:", err);
      }
    };

    initTerminal();

    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  // Spawn on rising edge of shouldSpawn — NO cleanup kill
  useEffect(() => {
    if (!isLoaded || !shouldSpawn) return;

    const currentCwd = cwdRef.current;
    const currentSession = sessionRef.current;
    if (!currentCwd || !currentSession) return;
    if (!currentSession.cliCommand) return;

    outputBufferRef.current = "";
    terminalRef.current?.clear();
    const cols = terminalRef.current?.cols ?? 80;
    const rows = terminalRef.current?.rows ?? 24;

    spawnRef
      .current(
        currentCwd,
        cols,
        rows,
        currentSession.cliCommand,
        resumeArgsRef.current,
      )
      .then((ptySession) => {
        if (ptySession) {
          removeSpawningRef.current(sessionIdRef.current);
          updateSessionPtyRef.current(
            sessionIdRef.current,
            ptySession.sessionId,
          );
        }
      });

    // No cleanup kill here — sessions survive switching
  }, [shouldSpawn, isLoaded]);

  // Kill PTY only on unmount (session removed from DOM)
  useEffect(() => {
    return () => {
      killRef.current();
    };
  }, []);

  // Fit terminal when becoming visible
  useEffect(() => {
    if (isVisible && isLoaded && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
      });
    }
  }, [isVisible, isLoaded]);

  // Debounced resize handler
  const handleResizeDebounced = useMemo(
    () =>
      debounce(() => {
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit();
          resize(terminalRef.current.cols, terminalRef.current.rows);
        }
      }, 150),
    [resize],
  );

  // Handle resize
  useEffect(() => {
    if (!isLoaded) return;

    const resizeObserver = new ResizeObserver(() => {
      handleResizeDebounced();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", handleResizeDebounced);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResizeDebounced);
      handleResizeDebounced.cancel();
    };
  }, [isLoaded, handleResizeDebounced]);

  const showEmptyState = !shouldSpawn && !isConnected;

  return (
    <div
      className={cn(
        "bg-background border-border flex min-h-0 flex-col overflow-hidden rounded-xl border",
        className,
      )}
    >
      {/* Main area */}
      <div className="relative min-h-0 flex-1">
        {/* Terminal container - always mounted, hidden when idle */}
        <div
          ref={containerRef}
          className={cn(
            "absolute inset-0 overflow-hidden p-2",
            showEmptyState && "invisible",
          )}
        />

        {/* Empty state overlay */}
        {showEmptyState && <CliEmptyState />}
      </div>

      {/* Error bar */}
      {error && (
        <div className="border-border bg-destructive text-destructive-foreground border-t px-3 py-1 text-xs">
          {error}
        </div>
      )}

      {/* Bottom action bar */}
      <CliBottomBar
        sessionId={sessionId}
        isConnected={isConnected}
        onStop={handleGracefulStop}
        onRestart={handleGracefulRestart}
        onNewSession={onNewSession}
      />
    </div>
  );
});
