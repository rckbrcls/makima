import { useMemo, useState } from "react"
import {
  languages,
  replacePackageManager,
  type FrameworkCommand,
} from "@/lib/command-hub/data/framework-commands"

interface TemplateState {
  language: string
  framework: string
  packageManager: "pnpm" | "npm" | "yarn"
  command: string
}

const initialState: TemplateState = {
  language: "custom",
  framework: "custom",
  packageManager: "pnpm",
  command: "custom",
}

export function useTemplateSelector() {
  const [state, setState] = useState<TemplateState>(initialState)

  const selectedLanguageData = useMemo(() => {
    return languages.find((l) => l.id === state.language)
  }, [state.language])

  const availableFrameworks = useMemo(() => {
    if (!selectedLanguageData) return []
    return selectedLanguageData.frameworks
  }, [selectedLanguageData])

  const selectedFrameworkData = useMemo(() => {
    if (!selectedLanguageData || state.framework === "custom") return null
    return selectedLanguageData.frameworks.find(
      (f) => f.id === state.framework
    )
  }, [selectedLanguageData, state.framework])

  const availableCommands = useMemo(() => {
    if (!selectedFrameworkData) return []
    return selectedFrameworkData.commands
  }, [selectedFrameworkData])

  const selectedCommandData = useMemo(() => {
    if (!selectedFrameworkData || state.command === "custom") return null
    return selectedFrameworkData.commands.find((c) => c.id === state.command)
  }, [selectedFrameworkData, state.command])

  const setLanguage = (languageId: string) => {
    setState({
      language: languageId,
      framework: "custom",
      packageManager: "pnpm",
      command: "custom",
    })
  }

  const setFramework = (frameworkId: string) => {
    setState((prev) => ({
      ...prev,
      framework: frameworkId,
      command: "custom",
    }))
  }

  const setPackageManager = (packageManager: "pnpm" | "npm" | "yarn") => {
    setState((prev) => ({ ...prev, packageManager }))
  }

  const setCommand = (commandId: string) => {
    setState((prev) => ({ ...prev, command: commandId }))
  }

  const applyCommand = (): {
    commandName: string
    baseCommand: string
    args: string
    commandType: FrameworkCommand["commandType"]
  } | null => {
    if (!selectedCommandData) return null

    let baseCommand = selectedCommandData.baseCommand
    if (
      selectedFrameworkData?.requiresPackageManager &&
      state.packageManager
    ) {
      baseCommand = replacePackageManager(
        selectedCommandData.baseCommand,
        state.packageManager
      )
    }

    return {
      commandName: selectedCommandData.commandName,
      baseCommand,
      args: selectedCommandData.args,
      commandType: selectedCommandData.commandType,
    }
  }

  const reset = () => {
    setState(initialState)
  }

  return {
    state,
    selectedLanguageData,
    availableFrameworks,
    selectedFrameworkData,
    availableCommands,
    selectedCommandData,
    setLanguage,
    setFramework,
    setPackageManager,
    setCommand,
    applyCommand,
    reset,
  }
}
