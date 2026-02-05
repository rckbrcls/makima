import { create } from "zustand";
import type {
  Command,
  DashboardState,
  ExecutionLogLine,
  NewRepositoryInput,
  Repository,
  RunCommandInput,
  StopCommandInput,
} from "@/components/repos/types";
import { toast } from "@/components/ui/sonner";
import { mockCommandHubDashboard } from "@/mocks";

// ============================================================================
// Helpers
// ============================================================================

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
};

// ============================================================================
// Command Store
// ============================================================================

interface CommandStore extends DashboardState {
  // Actions
  refreshState: () => Promise<void>;
  runCommand: (request: RunCommandInput) => Promise<void>;
  stopCommand: (request: StopCommandInput) => Promise<void>;
  addRepository: (input: NewRepositoryInput) => Promise<boolean>;
  deleteRepository: (repo: string) => Promise<boolean>;
  addCommand: (command: Command) => Promise<void>;
  updateCommand: (command: Command) => Promise<void>;
  deleteCommand: (repo: string, name: string) => Promise<boolean>;
  getExecutionLogs: (executionId: number) => Promise<Array<ExecutionLogLine>>;

  // State setters (internal use mostly, but exposed if needed)
  setState: (fn: (state: DashboardState) => Partial<DashboardState>) => void;
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  // Initial State
  ...mockCommandHubDashboard,

  // Actions
  setState: (fn) => set((state) => fn(state)),

  refreshState: async () => {
    // Mock refresh - no-op or re-fetch from "backend"
  },

  runCommand: async (request: RunCommandInput) => {
    const commandLabel = request.name ?? request.command;
    const toastId = toast.loading("Running command...", {
      description: `${request.repo} · ${commandLabel}`,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      set((prev) => {
        const nextCommands = prev.commands.map((c) => {
          if (
            c.repo === request.repo &&
            (c.name === request.name || c.command === request.command)
          ) {
            return { ...c, status: "running" as const, lastRun: "now" };
          }
          return c;
        });

        const existingLive = prev.liveExecutions.find(
          (e) => e.repo === request.repo && e.command === request.command,
        );

        let nextLive = prev.liveExecutions;
        if (!existingLive) {
          nextLive = [
            ...prev.liveExecutions,
            {
              repo: request.repo,
              command: request.command,
              pid: Math.floor(Math.random() * 10000) + 1000,
              cpu: "0.1%",
              ram: "50MB",
              logs: [{ line: "Command started...", stream: "stdout" }],
            },
          ];
        }

        return {
          ...prev,
          commands: nextCommands,
          liveExecutions: nextLive,
        };
      });

      toast.success("Command started", {
        id: toastId,
        description: `${request.repo} · ${commandLabel}`,
      });
    } catch (error) {
      toast.error("Failed to run command", {
        id: toastId,
        description: getErrorMessage(error),
      });
    }
  },

  stopCommand: async (request: StopCommandInput) => {
    const toastId = toast.loading("Stopping command...", {
      description: `${request.repo} · ${request.command}`,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      set((prev) => {
        const nextCommands = prev.commands.map((c) => {
          if (c.repo === request.repo && c.command === request.command) {
            return { ...c, status: "stopped" as const };
          }
          return c;
        });

        const nextLive = prev.liveExecutions.filter(
          (e) => !(e.repo === request.repo && e.command === request.command),
        );

        return {
          ...prev,
          commands: nextCommands,
          liveExecutions: nextLive,
        };
      });

      toast.success("Command stopped", {
        id: toastId,
        description: `${request.repo} · ${request.command}`,
      });
    } catch (error) {
      toast.error("Failed to stop command", {
        id: toastId,
        description: getErrorMessage(error),
      });
    }
  },

  addRepository: async (input: NewRepositoryInput) => {
    const repo: Repository = {
      name: input.name,
      path: input.path,
      branch: input.branch,
      tech: input.tech,
      status: "idle",
      lastRun: "never",
      running: "-",
    };

    const toastId = toast.loading("Adding repository...", {
      description: repo.name,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      set((prev) => ({
        ...prev,
        repositories: [...prev.repositories, repo],
      }));

      toast.success("Repository added", {
        id: toastId,
        description: repo.name,
      });
      return true;
    } catch (error) {
      toast.error("Failed to add repository", {
        id: toastId,
        description: getErrorMessage(error),
      });
      return false;
    }
  },

  addCommand: async (command: Command) => {
    const toastId = toast.loading("Saving command...", {
      description: `${command.repo} · ${command.name}`,
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      set((prev) => ({
        ...prev,
        commands: [...prev.commands, command],
      }));

      toast.success("Command saved", {
        id: toastId,
        description: `${command.repo} · ${command.name}`,
      });
    } catch (error) {
      toast.error("Failed to save command", {
        id: toastId,
        description: getErrorMessage(error),
      });
    }
  },

  updateCommand: async (command: Command) => {
    const toastId = toast.loading("Updating command...", {
      description: `${command.repo} · ${command.name}`,
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      set((prev) => ({
        ...prev,
        commands: prev.commands.map((c) =>
          c.repo === command.repo && c.name === command.name ? command : c,
        ),
      }));

      toast.success("Command updated", {
        id: toastId,
        description: `${command.repo} · ${command.name}`,
      });
    } catch (error) {
      toast.error("Failed to update command", {
        id: toastId,
        description: getErrorMessage(error),
      });
    }
  },

  deleteCommand: async (repo: string, name: string) => {
    const toastId = toast.loading("Deleting command...", {
      description: `${repo} · ${name}`,
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      set((prev) => ({
        ...prev,
        commands: prev.commands.filter(
          (c) => !(c.repo === repo && c.name === name),
        ),
      }));

      toast.success("Command deleted", {
        id: toastId,
        description: `${repo} · ${name}`,
      });
      return true;
    } catch (error) {
      toast.error("Failed to delete command", {
        id: toastId,
        description: getErrorMessage(error),
      });
      return false;
    }
  },

  deleteRepository: async (repo: string) => {
    const toastId = toast.loading("Deleting repository...", {
      description: repo,
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      set((prev) => ({
        ...prev,
        repositories: prev.repositories.filter((r) => r.name !== repo),
        commands: prev.commands.filter((c) => c.repo !== repo),
      }));

      toast.success("Repository deleted", {
        id: toastId,
        description: repo,
      });
      return true;
    } catch (error) {
      toast.error("Failed to delete repository", {
        id: toastId,
        description: getErrorMessage(error),
      });
      return false;
    }
  },

  getExecutionLogs: async (executionId: number) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return [
        { line: "Mock log line 1", stream: "stdout" as const },
        { line: "Mock log line 2", stream: "stdout" as const },
      ] as Array<ExecutionLogLine>;
    } catch {
      return [];
    }
  },
}));
