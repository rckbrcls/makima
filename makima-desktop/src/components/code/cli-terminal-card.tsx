import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FitAddon } from "@xterm/addon-fit"
import type { Terminal } from "@xterm/xterm"
import { useTerminal } from "@/hooks/use-terminal"
import { cn } from "@/lib/utils"

type TerminalRenderer = 'dom' | 'canvas' | 'webgl'
const TERMINAL_RENDERER = 'dom' as TerminalRenderer

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

interface CliTerminalCardProps {
  cwd?: string
  command?: string
  args?: Array<string>
  shouldSpawn: boolean
  className?: string
  onSessionStart?: (ptySessionId: string) => void
  onSessionExit?: (exitCode?: number) => void
}

export const CliTerminalCard = memo(function CliTerminalCard({
  cwd,
  command,
  args,
  shouldSpawn,
  className,
  onSessionStart,
  onSessionExit,
}: CliTerminalCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const isInitializedRef = useRef(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Store all props in refs so the spawn effect doesn't depend on them
  const cwdRef = useRef(cwd)
  const commandRef = useRef(command)
  const argsRef = useRef(args)
  const onSessionStartRef = useRef(onSessionStart)
  const onSessionExitRef = useRef(onSessionExit)

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

  const { spawn, write, resize, kill, isConnected, error } = useTerminal({
    onOutput: useCallback((data: string) => {
      terminalRef.current?.write(data)
    }, []),
    onExit: useCallback((exitCode?: number) => {
      terminalRef.current?.writeln("\r\n[Process exited]")
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

        // To enable WebGL or Canvas renderer, install the addon package
        // (e.g. pnpm add @xterm/addon-webgl) then load it here based on
        // TERMINAL_RENDERER. DOM renderer is the default and needs no addon.

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

  return (
    <div
      className={cn(
        "border-border bg-card flex min-h-0 flex-col overflow-hidden rounded-xl border",
        className,
      )}
    >
      {/* Status bar */}
      <div className="border-border flex items-center justify-between border-b px-3 py-1.5">
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Connected
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="bg-muted-foreground size-1.5 rounded-full" />
            {shouldSpawn ? "Connecting..." : "Idle"}
          </span>
        )}
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden p-2" />

      {error && (
        <div className="border-border bg-destructive/10 text-destructive border-t px-3 py-1 text-xs">
          {error}
        </div>
      )}
    </div>
  )
})
