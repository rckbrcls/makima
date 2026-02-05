import { useEffect, useRef, useCallback, useState } from 'react'
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

  const { spawn, write, resize, isConnected, error } = useTerminal({
    cwd,
    onOutput: useCallback((data: string) => {
      terminalRef.current?.write(data)
    }, []),
    onExit: useCallback(() => {
      terminalRef.current?.writeln('\r\n[Process exited]')
    }, []),
  })

  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return

    // Dynamic import of xterm and addons
    const initTerminal = async () => {
      try {
        const [xtermModule, fitAddonModule, webLinksAddonModule] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
        ])

        // Also import CSS
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
            background: 'transparent',
            foreground: '#e4e4e7',
            cursor: '#e4e4e7',
            cursorAccent: '#18181b',
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
          allowTransparency: true,
          scrollback: 10000,
        })

        const fitAddon = new FitAddon()
        const webLinksAddon = new WebLinksAddon()

        terminal.loadAddon(fitAddon)
        terminal.loadAddon(webLinksAddon)
        terminal.open(containerRef.current)

        // Fit after a short delay to ensure container is sized
        requestAnimationFrame(() => {
          fitAddon.fit()
        })

        terminalRef.current = terminal
        fitAddonRef.current = fitAddon
        isInitializedRef.current = true
        setIsLoaded(true)

        // Handle user input
        terminal.onData((data) => {
          write(data)
        })

        // Spawn the PTY session
        const cols = terminal.cols
        const rows = terminal.rows
        spawn(cwd, cols, rows).then(() => {
          onReady?.()
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
  }, [cwd, spawn, write, onReady])

  // Handle resize
  useEffect(() => {
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
  }, [resize])

  return (
    <div
      className={cn(
        'bg-zinc-950 flex flex-col overflow-hidden rounded-lg border border-zinc-800',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-red-500" />
            <div className="size-3 rounded-full bg-yellow-500" />
            <div className="size-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-zinc-400">Terminal</span>
        </div>
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="size-1.5 rounded-full bg-zinc-500" />
            Disconnected
          </span>
        )}
      </div>
      <div ref={containerRef} className="flex-1 p-2" />
      {error && (
        <div className="border-t border-zinc-800 bg-red-950 px-3 py-1 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
