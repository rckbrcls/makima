import { useCallback, useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type {
  DashboardState,
  RunCommandInput,
  StopCommandInput,
} from "@/components/command-hub/types"
import {
  commands,
  executionHistory,
  historyStats,
  liveExecutions,
  pipelines,
  repositories,
  runQueue,
} from "@/lib/command-hub/mock-data"

const LOG_CAPACITY = 500

const mockState: DashboardState = {
  repositories,
  commands,
  liveExecutions,
  runQueue,
  pipelines,
  executionHistory,
  historyStats,
}

const emptyState: DashboardState = {
  repositories: [],
  commands: [],
  liveExecutions: [],
  runQueue: [],
  pipelines: [],
  executionHistory: [],
  historyStats: {
    totalRuns: 0,
    successRate: "0%",
    avgDuration: "00:00",
  },
}

type ExecutionLogEvent = {
  repo: string
  command: string
  line: string
  stream: string
}

const isTauriAvailable = () =>
  typeof window !== "undefined" &&
  !!((window as Record<string, unknown>).__TAURI_INTERNALS__ ||
    (window as Record<string, unknown>).__TAURI__)

export function useCommanderState() {
  const initialIsTauri = isTauriAvailable()
  const [state, setState] = useState<DashboardState>(
    initialIsTauri ? emptyState : mockState
  )
  const [usingMock, setUsingMock] = useState(!initialIsTauri)

  const refreshState = useCallback(async () => {
    if (!isTauriAvailable()) return
    const next = await invoke<DashboardState>("commander_state")
    setState(next)
  }, [])

  const runCommand = useCallback(async (request: RunCommandInput) => {
    if (!isTauriAvailable()) return
    await invoke("commander_run_command", { request })
  }, [])

  const stopCommand = useCallback(async (request: StopCommandInput) => {
    if (!isTauriAvailable()) return
    await invoke("commander_stop_command", { request })
  }, [])

  useEffect(() => {
    let active = true
    const unlisteners: UnlistenFn[] = []

    const setup = async () => {
      if (!isTauriAvailable()) {
        setUsingMock(true)
        setState(mockState)
        return
      }

      try {
        const initial = await invoke<DashboardState>("commander_state")
        if (!active) return
        setState(initial)
        setUsingMock(false)

        unlisteners.push(
          await listen<ExecutionLogEvent>(
            "commander://execution-log",
            (event) => {
              const payload = event.payload
              if (!payload) return
              setState((prev) => {
                const index = prev.liveExecutions.findIndex(
                  (item) =>
                    item.repo === payload.repo &&
                    item.command === payload.command
                )
                if (index === -1) return prev

                const target = prev.liveExecutions[index]
                const nextLogs = [...target.logs, payload.line]
                if (nextLogs.length > LOG_CAPACITY) {
                  nextLogs.splice(0, nextLogs.length - LOG_CAPACITY)
                }

                const nextLive = [...prev.liveExecutions]
                nextLive[index] = { ...target, logs: nextLogs }
                return { ...prev, liveExecutions: nextLive }
              })
            }
          )
        )

        unlisteners.push(
          await listen("commander://execution-started", () => {
            void refreshState()
          })
        )

        unlisteners.push(
          await listen("commander://execution-finished", () => {
            void refreshState()
          })
        )
      } catch (error) {
        if (!active) return
        console.warn("[commander] failed to connect to backend", error)
        setUsingMock(true)
        setState(mockState)
      }
    }

    void setup()

    return () => {
      active = false
      unlisteners.forEach((unlisten) => unlisten())
    }
  }, [refreshState])

  return {
    state,
    usingMock,
    refreshState,
    runCommand,
    stopCommand,
  }
}
