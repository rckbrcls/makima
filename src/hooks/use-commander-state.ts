import { useCallback, useEffect, useState } from "react"
import { invoke, isTauri } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type {
  Command,
  DashboardState,
  NewRepositoryInput,
  Repository,
  RunCommandInput,
  StopCommandInput,
} from "@/components/command-hub/types"
import { toast } from "@/components/ui/sonner"
import { computeStats } from "@/lib/command-hub/helpers"
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

const isTauriAvailable = () => {
  try {
    return isTauri()
  } catch {
    return false
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Unknown error"
}

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

  const runCommand = useCallback(
    async (request: RunCommandInput) => {
      if (!isTauriAvailable()) {
        toast.error("Backend unavailable", {
          description: "Tauri is not connected.",
        })
        return
      }
      const commandLabel = request.name ?? request.command
      const toastId = toast.loading("Running command...", {
        description: `${request.repo} · ${commandLabel}`,
      })
      try {
        await invoke("commander_run_command", { request })
        await refreshState()
        toast.success("Command started", {
          id: toastId,
          description: `${request.repo} · ${commandLabel}`,
        })
      } catch (error) {
        toast.error("Failed to run command", {
          id: toastId,
          description: getErrorMessage(error),
        })
      }
    },
    [refreshState]
  )

  const stopCommand = useCallback(
    async (request: StopCommandInput) => {
      if (!isTauriAvailable()) {
        toast.error("Backend unavailable", {
          description: "Tauri is not connected.",
        })
        return
      }
      const toastId = toast.loading("Stopping command...", {
        description: `${request.repo} · ${request.command}`,
      })
      try {
        await invoke("commander_stop_command", { request })
        await refreshState()
        toast.success("Command stopped", {
          id: toastId,
          description: `${request.repo} · ${request.command}`,
        })
      } catch (error) {
        toast.error("Failed to stop command", {
          id: toastId,
          description: getErrorMessage(error),
        })
      }
    },
    [refreshState]
  )

  const addRepository = useCallback(
    async (input: NewRepositoryInput) => {
      const repo: Repository = {
        name: input.name,
        path: input.path,
        branch: input.branch,
        tech: input.tech,
        status: "idle",
        lastRun: "never",
        running: "-",
      }

      if (!isTauriAvailable()) {
        let added = false
        setState((prev) => {
          if (prev.repositories.some((item) => item.name === repo.name)) {
            return prev
          }
          added = true
          const nextRepositories = [...prev.repositories, repo].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
          return { ...prev, repositories: nextRepositories }
        })

        if (added) {
          toast.success("Repository added", {
            description: repo.name,
          })
          return true
        }

        toast.error("Failed to add repository", {
          description: "Repository already exists.",
        })
        return false
      }

      const toastId = toast.loading("Adding repository...", {
        description: repo.name,
      })

      try {
        await invoke("commander_add_repository", { repo })

        let imported = 0
        try {
          imported = await invoke<number>("commander_import_commands", {
            repo: repo.name,
          })
        } catch (error) {
          console.warn("[commander] failed to auto-import commands", error)
        }

        await refreshState()

        toast.success("Repository added", {
          id: toastId,
          description:
            imported > 0
              ? `${repo.name} · ${imported} commands imported`
              : repo.name,
        })
        return true
      } catch (error) {
        toast.error("Failed to add repository", {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState]
  )

  const addCommand = useCallback(
    async (command: Command) => {
      if (!isTauriAvailable()) {
        toast.error("Backend unavailable", {
          description: "Tauri is not connected.",
        })
        return
      }
      const toastId = toast.loading("Saving command...", {
        description: `${command.repo} · ${command.name}`,
      })
      try {
        await invoke("commander_add_command", { command })
        await refreshState()
        toast.success("Command saved", {
          id: toastId,
          description: `${command.repo} · ${command.name}`,
        })
      } catch (error) {
        toast.error("Failed to save command", {
          id: toastId,
          description: getErrorMessage(error),
        })
      }
    },
    [refreshState]
  )

  const deleteCommand = useCallback(
    async (repo: string, name: string) => {
      if (!isTauriAvailable()) {
        let removed = false
        setState((prev) => {
          const target = prev.commands.find(
            (item) => item.repo === repo && item.name === name
          )
          if (!target) {
            return prev
          }
          if (target.status === "running") {
            return prev
          }
          removed = true
          return {
            ...prev,
            commands: prev.commands.filter(
              (item) => !(item.repo === repo && item.name === name)
            ),
            liveExecutions: prev.liveExecutions.filter(
              (item) => !(item.repo === repo && item.command === name)
            ),
            runQueue: prev.runQueue.filter(
              (item) => !(item.repo === repo && item.name === name)
            ),
          }
        })

        if (removed) {
          toast.success("Command deleted", { description: `${repo} · ${name}` })
          return true
        }

        toast.error("Failed to delete command", {
          description: "Stop the command before deleting.",
        })
        return false
      }

      const toastId = toast.loading("Deleting command...", {
        description: `${repo} · ${name}`,
      })
      try {
        await invoke("commander_delete_command", { repo, name })
        await refreshState()
        toast.success("Command deleted", {
          id: toastId,
          description: `${repo} · ${name}`,
        })
        return true
      } catch (error) {
        toast.error("Failed to delete command", {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState]
  )

  const deleteRepository = useCallback(
    async (repo: string) => {
      if (!isTauriAvailable()) {
        let removed = false
        setState((prev) => {
          if (!prev.repositories.some((item) => item.name === repo)) {
            return prev
          }
          const hasRunning = prev.commands.some(
            (item) => item.repo === repo && item.status === "running"
          )
          if (hasRunning) {
            return prev
          }
          removed = true
          const nextHistory = prev.executionHistory.filter(
            (item) => item.repo !== repo
          )
          return {
            ...prev,
            repositories: prev.repositories.filter(
              (item) => item.name !== repo
            ),
            commands: prev.commands.filter((item) => item.repo !== repo),
            liveExecutions: prev.liveExecutions.filter(
              (item) => item.repo !== repo
            ),
            runQueue: prev.runQueue.filter((item) => item.repo !== repo),
            pipelines: prev.pipelines.filter((item) => item.repo !== repo),
            executionHistory: nextHistory,
            historyStats: computeStats(nextHistory),
          }
        })

        if (removed) {
          toast.success("Repository deleted", { description: repo })
          return true
        }

        toast.error("Failed to delete repository", {
          description: "Stop running commands before deleting.",
        })
        return false
      }

      const toastId = toast.loading("Deleting repository...", {
        description: repo,
      })
      try {
        await invoke("commander_delete_repository", { repo })
        await refreshState()
        toast.success("Repository deleted", {
          id: toastId,
          description: repo,
        })
        return true
      } catch (error) {
        toast.error("Failed to delete repository", {
          id: toastId,
          description: getErrorMessage(error),
        })
        return false
      }
    },
    [refreshState]
  )

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
    addRepository,
    addCommand,
    deleteCommand,
    deleteRepository,
  }
}
