import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PtySession,
  PtySessionDb,
  PtyOutputPayload,
  PtyExitPayload,
} from '@/lib/code-types'
import { mapPtySession } from '@/lib/code-types'

export interface TerminalOptions {
  cwd?: string
  cols?: number
  rows?: number
  onOutput?: (data: string) => void
  onExit?: (exitCode?: number) => void
}

export function useTerminal(options: TerminalOptions = {}) {
  const [session, setSession] = useState<PtySession | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unlistenOutputRef = useRef<UnlistenFn | null>(null)
  const unlistenExitRef = useRef<UnlistenFn | null>(null)
  const optionsRef = useRef(options)

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const spawn = useCallback(
    async (cwd?: string, cols?: number, rows?: number): Promise<PtySession | null> => {
      setError(null)
      try {
        const result = await invoke<PtySessionDb>('pty_spawn', {
          cwd: cwd ?? optionsRef.current.cwd,
          cols: cols ?? optionsRef.current.cols ?? 80,
          rows: rows ?? optionsRef.current.rows ?? 24,
        })
        const ptySession = mapPtySession(result)
        setSession(ptySession)
        setIsConnected(true)

        // Set up event listeners
        unlistenOutputRef.current = await listen<PtyOutputPayload>(
          'pty:output',
          (event) => {
            if (event.payload.sessionId === ptySession.sessionId) {
              optionsRef.current.onOutput?.(event.payload.data)
            }
          },
        )

        unlistenExitRef.current = await listen<PtyExitPayload>(
          'pty:exit',
          (event) => {
            if (event.payload.sessionId === ptySession.sessionId) {
              setIsConnected(false)
              setSession(null)
              optionsRef.current.onExit?.(event.payload.exitCode ?? undefined)
            }
          },
        )

        return ptySession
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      }
    },
    [],
  )

  const write = useCallback(
    async (data: string): Promise<boolean> => {
      if (!session) return false
      try {
        await invoke('pty_write', {
          sessionId: session.sessionId,
          data,
        })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [session],
  )

  const resize = useCallback(
    async (cols: number, rows: number): Promise<boolean> => {
      if (!session) return false
      try {
        await invoke('pty_resize', {
          sessionId: session.sessionId,
          cols,
          rows,
        })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [session],
  )

  const kill = useCallback(async (): Promise<boolean> => {
    if (!session) return false
    try {
      await invoke('pty_kill', {
        sessionId: session.sessionId,
      })
      setSession(null)
      setIsConnected(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }, [session])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unlistenOutputRef.current?.()
      unlistenExitRef.current?.()
      if (session) {
        invoke('pty_kill', { sessionId: session.sessionId }).catch(() => {})
      }
    }
  }, [session])

  return {
    session,
    isConnected,
    error,
    spawn,
    write,
    resize,
    kill,
  }
}
