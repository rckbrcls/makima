import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, Plus, RotateCcw, Square } from "lucide-react"
import type { FitAddon } from "@xterm/addon-fit"
import type { Terminal } from "@xterm/xterm"
import { useTerminal } from "@/hooks/use-terminal"
import { extractResumeId, stripAnsi } from "@/lib/cli-resume"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Blob3D } from "@/components/visuals/blob-3d"
import { Typewriter } from "@/components/ui/typewriter"
import {
  useCliActiveSession,
  useCliSessionActions,
  useInstalledClis,
  useSelectedCliCommand,
} from "@/stores"

// Debounce utility for resize handling
function debounce<T extends (...args: Array<unknown>) => void>(
  fn: T,
  ms: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout>
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => clearTimeout(timeoutId)
  return debounced
}

const CLI_SUGGESTIONS = [
  "Select a CLI and hit Start",
  "Run AI agents on your codebase",
  "Execute commands in real time",
  "Manage multiple sessions at once",
]

// ============================================================================
// Empty State
// ============================================================================

function CliEmptyState() {
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
  )
}

// ============================================================================
// Bottom Action Bar
// ============================================================================

interface CliBottomBarProps {
  isConnected: boolean
  onStart: () => void
  onNewSession: () => void
  onStop: () => void
  onRestart: () => void
}

function CliBottomBar({
  isConnected,
  onStart,
  onNewSession,
  onStop,
  onRestart,
}: CliBottomBarProps) {
  const installedClis = useInstalledClis()
  const selectedCommand = useSelectedCliCommand()
  const activeSession = useCliActiveSession()
  const { setSelectedCliCommand } = useCliSessionActions()

  const isRunning = activeSession?.status === "running"
  const isExited = activeSession?.status === "exited"
  const hasError = activeSession?.status === "error"

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
        value={selectedCommand ?? ""}
        onChange={(e) => setSelectedCliCommand(e.target.value || null)}
        disabled={isRunning}
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
      {activeSession && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            isRunning &&
              "border-emerald-500 bg-emerald-600 text-emerald-950",
            isExited &&
              "border-secondary bg-secondary text-secondary-foreground",
            hasError &&
              "border-destructive bg-destructive text-destructive-foreground",
          )}
        >
          {activeSession.status}
        </Badge>
      )}

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button
            variant="default"
            size="xs"
            onClick={onStart}
            disabled={!selectedCommand}
          >
            <Play className="mr-1 size-3" />
            Start
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="xs"
              onClick={onNewSession}
              disabled={!selectedCommand}
            >
              <Plus className="mr-1 size-3" />
              New
            </Button>
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
  )
}

// ============================================================================
// Terminal Card
// ============================================================================

interface CliTerminalCardProps {
  cwd?: string
  command?: string
  args?: Array<string>
  shouldSpawn: boolean
  className?: string
  onStart: () => void
  onNewSession: () => void
  onStop: () => void
  onRestart: () => void
  onSessionStart?: (ptySessionId: string) => void
  onSessionExit?: (exitCode?: number) => void
  onResumeIdCaptured?: (resumeId: string) => void
}

export const CliTerminalCard = memo(function CliTerminalCard({
  cwd,
  command,
  args,
  shouldSpawn,
  className,
  onStart,
  onNewSession,
  onStop,
  onRestart,
  onSessionStart,
  onSessionExit,
  onResumeIdCaptured,
}: CliTerminalCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const isInitializedRef = useRef(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Output buffer for resume ID detection (ref, no re-renders)
  const outputBufferRef = useRef('')
  const MAX_BUFFER_SIZE = 2048

  // Store all props in refs so the spawn effect doesn't depend on them
  const cwdRef = useRef(cwd)
  const commandRef = useRef(command)
  const argsRef = useRef(args)
  const onSessionStartRef = useRef(onSessionStart)
  const onSessionExitRef = useRef(onSessionExit)
  const onResumeIdCapturedRef = useRef(onResumeIdCaptured)
  const onStopRef = useRef(onStop)
  const onRestartRef = useRef(onRestart)

  useEffect(() => {
    cwdRef.current = cwd
  }, [cwd])
  useEffect(() => {
    commandRef.current = command
  }, [command])
  useEffect(() => {
    argsRef.current = args
  }, [args])
  useEffect(() => {
    onSessionStartRef.current = onSessionStart
  }, [onSessionStart])
  useEffect(() => {
    onSessionExitRef.current = onSessionExit
  }, [onSessionExit])
  useEffect(() => {
    onResumeIdCapturedRef.current = onResumeIdCaptured
  }, [onResumeIdCaptured])
  useEffect(() => {
    onStopRef.current = onStop
  }, [onStop])
  useEffect(() => {
    onRestartRef.current = onRestart
  }, [onRestart])

  const { spawn, write, resize, kill, isConnected, error } = useTerminal({
    onOutput: useCallback((data: string) => {
      terminalRef.current?.write(data)
      const clean = stripAnsi(data)
      outputBufferRef.current += clean
      if (outputBufferRef.current.length > MAX_BUFFER_SIZE) {
        outputBufferRef.current = outputBufferRef.current.slice(-MAX_BUFFER_SIZE)
      }
      // Continuous detection: capture resume ID as soon as it appears in output
      if (outputBufferRef.current.includes('resume')) {
        const resumeId = extractResumeId(outputBufferRef.current)
        if (resumeId) {
          onResumeIdCapturedRef.current?.(resumeId)
        }
      }
    }, []),
    onExit: useCallback((exitCode?: number) => {
      terminalRef.current?.writeln("\r\n[Process exited]")
      const resumeId = extractResumeId(outputBufferRef.current)
      if (resumeId) {
        onResumeIdCapturedRef.current?.(resumeId)
      }
      onSessionExitRef.current?.(exitCode)
    }, []),
  })

  // Store spawn/write/kill in refs to avoid effect dependencies
  const spawnRef = useRef(spawn)
  const writeRef = useRef(write)
  const killRef = useRef(kill)

  useEffect(() => {
    spawnRef.current = spawn
    writeRef.current = write
    killRef.current = kill
  }, [spawn, write, kill])

  // Graceful stop: send Ctrl+C (twice for CLIs that need it), wait for resume
  // ID capture, then proceed with stop/restart. Timeout ensures we never hang.
  const gracefulTimersRef = useRef<Array<ReturnType<typeof setTimeout | typeof setInterval>>>([])

  const clearGracefulTimers = useCallback(() => {
    for (const id of gracefulTimersRef.current) clearTimeout(id)
    gracefulTimersRef.current = []
  }, [])

  const gracefulShutdown = useCallback(
    (onDone: () => void) => {
      clearGracefulTimers()

      // 1st Ctrl+C — interrupts current operation
      writeRef.current('\x03')

      // 2nd Ctrl+C after 150ms — triggers graceful exit
      gracefulTimersRef.current.push(
        setTimeout(() => writeRef.current('\x03'), 150),
      )

      // Poll buffer for resume ID every 100ms; proceed once found or timeout
      let elapsed = 0
      const pollId = setInterval(() => {
        elapsed += 100
        const resumeId = extractResumeId(outputBufferRef.current)
        if (resumeId) {
          onResumeIdCapturedRef.current?.(resumeId)
          clearGracefulTimers()
          onDone()
        } else if (elapsed >= 2000) {
          clearGracefulTimers()
          onDone()
        }
      }, 100)
      gracefulTimersRef.current.push(pollId as unknown as ReturnType<typeof setTimeout>)
    },
    [clearGracefulTimers],
  )

  const handleGracefulStop = useCallback(() => {
    gracefulShutdown(() => onStopRef.current())
  }, [gracefulShutdown])

  const handleGracefulRestart = useCallback(() => {
    gracefulShutdown(() => onRestartRef.current())
  }, [gracefulShutdown])

  // Clean up graceful timers on unmount
  useEffect(() => {
    return () => clearGracefulTimers()
  }, [clearGracefulTimers])

  // Initialize xterm (just the terminal UI, no spawning)
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return

    const initTerminal = async () => {
      try {
        const [xtermModule, fitAddonModule, webLinksAddonModule] =
          await Promise.all([
            import("@xterm/xterm"),
            import("@xterm/addon-fit"),
            import("@xterm/addon-web-links"),
          ])

        await import("@xterm/xterm/css/xterm.css")

        const { Terminal } = xtermModule
        const { FitAddon } = fitAddonModule
        const { WebLinksAddon } = webLinksAddonModule

        if (!containerRef.current || isInitializedRef.current) return

        // Read theme colors from CSS variables so terminal matches bg-card
        const rootStyles = getComputedStyle(document.documentElement)
        const cardBg = rootStyles.getPropertyValue('--card').trim()
        const cardFg = rootStyles.getPropertyValue('--card-foreground').trim()

        const terminal = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: "JetBrains Mono Variable, Menlo, Monaco, monospace",
          theme: {
            background: cardBg,
            foreground: cardFg,
            cursor: cardFg,
            cursorAccent: cardBg,
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
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()

        terminal.loadAddon(fitAddon)
        terminal.loadAddon(webLinksAddon)
        terminal.open(containerRef.current)

        requestAnimationFrame(() => {
          fitAddon.fit()
        })

        terminalRef.current = terminal
        fitAddonRef.current = fitAddon
        isInitializedRef.current = true
        setIsLoaded(true)

        // Handle user input
        terminal.onData((data) => {
          writeRef.current(data)
        })
      } catch (err) {
        console.error("Failed to load terminal:", err)
      }
    }

    initTerminal()

    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
        fitAddonRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [])

  // Handle spawn/kill based on shouldSpawn ONLY
  // All other values are read from refs to avoid re-trigger loops
  useEffect(() => {
    if (!isLoaded || !shouldSpawn) return

    const currentCwd = cwdRef.current
    const currentCommand = commandRef.current
    if (!currentCwd || !currentCommand) return

    outputBufferRef.current = ''
    terminalRef.current?.clear()
    const cols = terminalRef.current?.cols ?? 80
    const rows = terminalRef.current?.rows ?? 24

    spawnRef
      .current(currentCwd, cols, rows, currentCommand, argsRef.current)
      .then((session) => {
        if (session) {
          onSessionStartRef.current?.(session.sessionId)
        }
      })

    return () => {
      killRef.current()
    }
  }, [shouldSpawn, isLoaded])

  // Debounced resize handler
  const handleResizeDebounced = useMemo(
    () =>
      debounce(() => {
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit()
          resize(terminalRef.current.cols, terminalRef.current.rows)
        }
      }, 150),
    [resize],
  )

  // Handle resize
  useEffect(() => {
    if (!isLoaded) return

    const resizeObserver = new ResizeObserver(() => {
      handleResizeDebounced()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener("resize", handleResizeDebounced)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", handleResizeDebounced)
      handleResizeDebounced.cancel()
    }
  }, [isLoaded, handleResizeDebounced])

  const showEmptyState = !shouldSpawn && !isConnected

  return (
    <div
      className={cn(
        "glass flex min-h-0 flex-col overflow-hidden rounded-xl",
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
        isConnected={isConnected}
        onStart={onStart}
        onNewSession={onNewSession}
        onStop={handleGracefulStop}
        onRestart={handleGracefulRestart}
      />
    </div>
  )
})
