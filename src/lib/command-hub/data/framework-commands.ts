import type { CommandType } from "@/components/command-hub/types"

export interface FrameworkCommand {
  id: string
  label: string
  commandName: string
  baseCommand: string
  args: string
  commandType: CommandType
  description?: string
}

export interface Framework {
  id: string
  label: string
  requiresPackageManager?: boolean
  commands: FrameworkCommand[]
}

export interface Language {
  id: string
  label: string
  frameworks: Framework[]
}

export const languages: Language[] = [
  {
    id: "javascript",
    label: "JavaScript/TypeScript",
    frameworks: [
      {
        id: "nodejs",
        label: "Node.js",
        requiresPackageManager: true,
        commands: [
          {
            id: "dev",
            label: "Dev",
            commandName: "dev",
            baseCommand: "pnpm run dev",
            args: "",
            commandType: "run",
            description: "Start development server",
          },
          {
            id: "start",
            label: "Start",
            commandName: "start",
            baseCommand: "pnpm start",
            args: "",
            commandType: "run",
            description: "Start production server",
          },
          {
            id: "build",
            label: "Build",
            commandName: "build",
            baseCommand: "pnpm run build",
            args: "",
            commandType: "build",
            description: "Build for production",
          },
          {
            id: "test",
            label: "Test",
            commandName: "test",
            baseCommand: "pnpm test",
            args: "",
            commandType: "test",
            description: "Run tests",
          },
          {
            id: "lint",
            label: "Lint",
            commandName: "lint",
            baseCommand: "pnpm run lint",
            args: "",
            commandType: "lint",
            description: "Run linter",
          },
          {
            id: "typecheck",
            label: "Type Check",
            commandName: "typecheck",
            baseCommand: "pnpm tsc --noEmit",
            args: "",
            commandType: "check",
            description: "Run TypeScript type checking",
          },
        ],
      },
      {
        id: "expo",
        label: "Expo",
        requiresPackageManager: true,
        commands: [
          {
            id: "start",
            label: "Start",
            commandName: "start",
            baseCommand: "pnpm expo start",
            args: "",
            commandType: "run",
            description: "Start Expo development server",
          },
          {
            id: "start:dev",
            label: "Start Dev Client",
            commandName: "start:dev",
            baseCommand: "pnpm expo start --dev-client",
            args: "",
            commandType: "run",
            description: "Start Expo with dev client",
          },
          {
            id: "android",
            label: "Android",
            commandName: "android",
            baseCommand: "pnpm expo run:android",
            args: "",
            commandType: "run",
            description: "Run on Android",
          },
          {
            id: "ios",
            label: "iOS",
            commandName: "ios",
            baseCommand: "pnpm expo run:ios",
            args: "",
            commandType: "run",
            description: "Run on iOS",
          },
          {
            id: "build:android",
            label: "Build Android",
            commandName: "build:android",
            baseCommand: "pnpm expo build:android",
            args: "",
            commandType: "build",
            description: "Build Android app",
          },
          {
            id: "build:ios",
            label: "Build iOS",
            commandName: "build:ios",
            baseCommand: "pnpm expo build:ios",
            args: "",
            commandType: "build",
            description: "Build iOS app",
          },
        ],
      },
      {
        id: "turborepo",
        label: "Turborepo",
        requiresPackageManager: true,
        commands: [
          {
            id: "dev",
            label: "Dev",
            commandName: "dev",
            baseCommand: "pnpm turbo run dev",
            args: "",
            commandType: "run",
            description: "Start Turborepo dev",
          },
          {
            id: "build",
            label: "Build",
            commandName: "build",
            baseCommand: "pnpm turbo run build",
            args: "",
            commandType: "build",
            description: "Build all packages",
          },
          {
            id: "test",
            label: "Test",
            commandName: "test",
            baseCommand: "pnpm turbo run test",
            args: "",
            commandType: "test",
            description: "Run all tests",
          },
          {
            id: "lint",
            label: "Lint",
            commandName: "lint",
            baseCommand: "pnpm turbo run lint",
            args: "",
            commandType: "lint",
            description: "Lint all packages",
          },
        ],
      },
    ],
  },
  {
    id: "rust",
    label: "Rust",
    frameworks: [
      {
        id: "tauri",
        label: "Tauri",
        requiresPackageManager: false,
        commands: [
          {
            id: "dev",
            label: "Dev",
            commandName: "dev",
            baseCommand: "pnpm tauri dev",
            args: "",
            commandType: "run",
            description: "Start Tauri development",
          },
          {
            id: "build",
            label: "Build",
            commandName: "build",
            baseCommand: "pnpm tauri build",
            args: "",
            commandType: "build",
            description: "Build Tauri application",
          },
        ],
      },
    ],
  },
]

// Helper function to replace package manager in command
export function replacePackageManager(
  command: string,
  packageManager: "pnpm" | "npm" | "yarn"
): string {
  if (packageManager === "pnpm") {
    return command
  }

  // Replace pnpm with npm or yarn at the start
  let result = command.replace(/^pnpm\s+/, () => {
    if (packageManager === "npm") {
      return "npm "
    }
    if (packageManager === "yarn") {
      return "yarn "
    }
    return "pnpm "
  })

  // Handle yarn specific differences
  if (packageManager === "yarn") {
    // yarn doesn't need "run" for simple npm scripts
    // Pattern: "yarn run <script>" → "yarn <script>"
    // But preserve for commands like "yarn expo start" or "yarn turbo run dev"
    const simpleScripts = ["dev", "build", "test", "lint", "start", "typecheck", "check"]
    for (const script of simpleScripts) {
      const regex = new RegExp(`^yarn\\s+run\\s+${script}(\\s|$)`)
      if (regex.test(result)) {
        result = result.replace(`yarn run ${script}`, `yarn ${script}`)
        break
      }
    }
  }

  return result
}
