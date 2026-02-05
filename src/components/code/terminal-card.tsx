import { useEffect, useRef, useState, useCallback } from 'react'
import { useTerminal } from '@/hooks/use-terminal'
import { cn } from '@/lib/utils'

// Dynamic import types
type TerminalType = import('@xterm/xterm').Terminal
type FitAddonType = import('@xterm/addon-fit').FitAddon

interface TerminalCardProps {
  cwd?: string
  className?: string
  onReady?: () => void
}

export function TerminalCard({ cwd, className, onReady }: TerminalCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<TerminalType | null>(null)
  const fitAddonRef = useRef<FitAddonType | null>(null)
  const isInitializedRef = useRef(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const onReadyRef = useRef(onReady)
  const cwdRef = useRef(cwd)

  // Keep refs updated
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    cwdRef.current = cwd
  }, [cwd])

  const { spawn, write, resize, kill, isConnected, error } = useTerminal({
    cwd,
    onOutput: useCallback((data: string) => {
      terminalRef.current?.write(data)
    }, []),
    onExit: useCallback(() => {
      terminalRef.current?.writeln('\r\n[Process exited]')
    }, []),
  })

  // Store spawn/write in refs to avoid effect dependencies
  const spawnRef = useRef(spawn)
  const writeRef = useRef(write)
  const killRef = useRef(kill)

  useEffect(() => {
    spawnRef.current = spawn
    writeRef.current = write
    killRef.current = kill
  }, [spawn, write, kill])

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return

    const initTerminal = async () => {
      try {
        const [xtermModule, fitAddonModule, webLinksAddonModule] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
        ])

        await import('@xterm/xterm/css/xterm.css')

        const { Terminal } = xtermModule
        const { FitAddon } = fitAddonModule
        const { WebLinksAddon } = webLinksAddonModule

        if (!containerRef.current || isInitializedRef.current) return

        const terminal = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: 'JetBrains Mono Variable, Menlo, Monaco, monospace',
          theme: {
            background: '#09090b',
            foreground: '#e4e4e7',
            cursor: '#e4e4e7',
            cursorAccent: '#09090b',
            selectionBackground: '#3f3f46',
            black: '#18181b',
            red: '#f87171',
            green: '#4ade80',
            yellow: '#facc15',
            blue: '#60a5fa',
            magenta: '#c084fc',
            cyan: '#22d3ee',
            white: '#e4e4e7',
            brightBlack: '#52525b',
            brightRed: '#fca5a5',
            brightGreen: '#86efac',
            brightYellow: '#fde047',
            brightBlue: '#93c5fd',
            brightMagenta: '#d8b4fe',
            brightCyan: '#67e8f9',
            brightWhite: '#fafafa',
          },
          scrollback: 10000,
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

        // Spawn PTY session
        const cols = terminal.cols
        const rows = terminal.rows
        spawnRef.current(cwdRef.current, cols, rows).then(() => {
          onReadyRef.current?.()
        })
      } catch (err) {
        console.error('Failed to load terminal:', err)
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

  // Handle cwd changes - respawn PTY
  useEffect(() => {
    if (!isLoaded || !cwd) return

    // Kill existing session and spawn new one
    terminalRef.current?.clear()

    killRef.current().then(() => {
      const cols = terminalRef.current?.cols ?? 80
      const rows = terminalRef.current?.rows ?? 24
      spawnRef.current(cwd, cols, rows)
    })
  }, [cwd, isLoaded])

  // Handle resize
  useEffect(() => {
    if (!isLoaded) return

    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        resize(terminalRef.current.cols, terminalRef.current.rows)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [isLoaded, resize])

  return (
    <div
      className={cn(
        'bg-[#09090B] flex flex-col overflow-hidden rounded-xl border border-border',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border  px-3 py-2">
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Disconnected
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 p-2" />

      {error && (
        <div className="border-t border-border bg-destructive/10 px-3 py-1 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
