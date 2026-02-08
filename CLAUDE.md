# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OpenClaw Orchestrator** is a local-first desktop application for orchestrating AI agents and real executions on the user's machine. Built with Tauri (Rust backend) and React (TypeScript frontend).

The app doesn't abstract terminal power — it **domesticates** it. Everything happens for real: real commands, real filesystem, real code, real agents. The app provides **control, visibility, security, and scale**.

### Core Philosophy

> Agents execute. The app remembers, organizes, and protects.

### Main Components

1. **OpenClaw (Agent Runtime)** - Stateless executor that runs commands, manipulates filesystem, calls tools. Receives context, executes, responds, terminates. No memory or history.

2. **Orchestrator App** - The brain. Manages conversation history, orchestrates Runs, controls permissions/policies, provides rich UX, coordinates multiple agents, offers observability.

3. **Jarvis** - Claude-like bot integration with dedicated UX. Can trigger runs, use skills, request human approval. Never executes outside app control.

4. **Runs/Executions** - Everything that executes becomes a Run (command, skill, pipeline, agent-triggered execution). Each has status, logs, duration, artifacts, context.

5. **Skills** - Reusable recipes defining inputs, context, steps, validations, expected output. Can call agents, run commands, compose pipelines.

## Commands

```bash
# Development
pnpm dev           # Desktop development with live reload (Tauri + Vite)
pnpm dev:vite      # Web-only development on localhost:3000

# Building
pnpm build         # Full Tauri desktop build (requires Rust toolchain)
pnpm build:vite    # Frontend bundle only

# Testing & Quality
pnpm test          # Run tests with Vitest
pnpm lint          # ESLint check
pnpm check         # Format and fix all (prettier + eslint --fix)
```

## Platform Support

Currently targeting **macOS only**. Cross-platform support planned for future releases.

## Tech Stack

- **Frontend**: React 19, TypeScript, TanStack Router (file-based routing), TanStack Query
- **State**: Zustand stores
- **UI**: Tailwind CSS 4, shadcn/ui, Radix UI primitives
- **Backend**: Tauri 2 (Rust), SQLite (rusqlite)
- **Build**: Vite 7, pnpm

## Architecture

### Data Flow

```
UI Components → Custom Hooks → Zustand Stores → Tauri IPC → Rust Backend (SQLite)
```

### Key Directories

- `src/routes/` - File-based routing (TanStack Router auto-generates `routeTree.gen.ts`)
- `src/pages/` - Page components (WorkspacePage, JarvisPage, AgentsBuilderPage, SettingsPage)
- `src/components/` - Feature-organized components (agents/, repos/, jarvis/, workspace/, ui/)
- `src/stores/` - Zustand stores with atomic selectors (see State Management section)
- `src/hooks/` - Custom hooks for business logic
  - `src/hooks/ollama/` - Split Ollama hooks (connection, models, pull, stream)
- `src-tauri/src/` - Rust backend (commands, database, process management, bridge protocol)

### State Management (Zustand)

The app uses Zustand stores with **atomic selectors** for optimal performance.

#### Stores Overview

- **SettingsStore**: Bridge mode, preferences, provider configs (persisted)
- **UIStore**: Drawer states, selections, mobile sidebar
- **ProviderStore**: Ollama/OpenAI/Anthropic connection state, models, auth
- **ChatStore**: Composer state, model selection
- **ConversationStore**: Conversations CRUD, streaming state
- **AnimationStore**: Per-message streaming animation

#### Mandatory Patterns

1. **Always use atomic selectors** - Never use `useStore()` without a selector

   ```typescript
   // WRONG - causes re-render on any state change
   const settings = useSettingsStore();

   // CORRECT - re-render only when mode changes
   const mode = useMode();
   ```

2. **Components access stores directly** - Never pass store state via props

   ```typescript
   // WRONG - prop drilling
   <ModelSelector selectedModel={model} onSelectModel={setModel} />

   // CORRECT - component uses stores internally
   <ModelSelector />
   ```

3. **Use actions selectors** - Stable references prevent re-renders

   ```typescript
   // CORRECT - actions have stable identity
   const { setMode, setPreference } = useSettingsActions();
   ```

4. **Never expose generic setters** - Use specific actions

   ```typescript
   // WRONG
   const { setConversations } = useConversations();

   // CORRECT
   const { addConversation, updateConversation } = useConversationActions();
   ```

#### Store Imports

Import from `@/stores` for centralized access:

```typescript
import {
  useMode,
  useSelectedModel,
  useChatActions,
  useConversationActions,
} from "@/stores";
```

### Routing

Routes are defined via files in `src/routes/`. Do not edit `routeTree.gen.ts` directly - it is auto-generated.

### Bridge Protocol

CLI/Agent communication uses NDJSON (newline-delimited JSON):

- Handshake: `hello` → `hello.ack`
- Messages: `log`, `plan`, `action.request`, `action.result`, `approval.requested`, `approval.result`
- Modes: "safe" (manual approval required) and "auto" (immediate execution)

### Execution Modes

- **Safe Mode** - All agent actions require human approval before execution
- **Auto Mode** - Actions execute immediately (based on policies/allowlists)

### UI Approach

Chat-first interface (ChatGPT/Cursor style):

- Streaming responses
- Executions appear as events in chat
- Raw terminal hidden by default
- Each conversation generates trackable Runs
- History lives in app (not in agent)

### CLI Session Architecture

The Code tab manages AI CLI sessions (Claude Code, Codex, etc.) via a terminal pool pattern.

#### Session Lifecycle

```
idle → running → exited
  │                 │
  └── (Start) ──────┘── (Start with --resume) → running
```

- **idle** — Session created but not yet spawned. CLI selector is unlocked.
- **running** — PTY process active. CLI selector is locked.
- **exited** — Process terminated. Resume ID may be available for reattach.

#### Terminal Pool

Sessions use stacked invisible `<CliTerminalCard>` components — one per session, only the active session is visible. All PTY processes remain alive regardless of which is visible, enabling true parallel sessions.

#### Graceful Shutdown Flow

When user clicks Stop or Restart:
1. Send `Ctrl+C` (\x03) to PTY
2. Wait 150ms, send second `Ctrl+C`
3. Wait 500ms for CLI to print resume instructions
4. Extract resume ID from output buffer via `extractResumeId()`
5. Call `pty_kill` to terminate the PTY process
6. Update session status to `exited`

On restart, after shutdown completes: `resetSession()` → `addSpawning()` triggers re-spawn.

#### Session Store (`CliSessionStore`)

- `sessions: Map<string, CliSession>` — All sessions keyed by ID
- `spawningSessions: Set<string>` — Sessions currently being spawned
- `useCliShouldSpawnSession(id)` — Returns `true` when a session is in the spawning set (triggers spawn effect)
- `addSpawning(id)` / `removeSpawning(id)` — Control spawn triggers

#### Resume Support

- `extractResumeId(output)` — Parses CLI output for session resume IDs
- `buildResumeArgs(command, resumeId)` — Builds `--resume <id>` args for CLI spawn
- Resume ID is captured both during graceful shutdown and via continuous output monitoring

## Adding New Features

### New Page

1. Create route file in `src/routes/mypage.tsx`
2. Create page component in `src/pages/mypage-page.tsx`
3. Router auto-generates route tree

### New Tauri Command

1. Implement in `src-tauri/src/commands.rs` or a feature module
2. Register in `lib.rs` via `tauri::generate_handler![...]`
3. Call from React: `await invoke('command_name', { args })`

## Code Style

- No semicolons (`semi: false`)
- Single quotes
- Trailing commas
- Tailwind classes auto-sorted by Prettier plugin
- **No transparency in colors** - Never use opacity modifiers like `bg-card/70`, `border-border/50`, `text-foreground/80`. All components must have solid colors without transparency.
- **Badges must have background** - Never use outline-only badges. All badges must have border, background, and text colors. Example: `border-sky-500 bg-sky-600 text-sky-950`.

### Theme-First Component Design

**Always use theme tokens and glass classes when creating new components.** Never use arbitrary/hardcoded colors (e.g. `bg-zinc-800`, `text-gray-400`, `border-slate-600`). All styling must come from the design system.

#### Theme Background & Color Tokens

Use only these semantic tokens for backgrounds, text, and borders:

- **Backgrounds**: `bg-background`, `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent`, `bg-destructive`, `bg-input`, `bg-sidebar`
- **Text**: `text-foreground`, `text-card-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-secondary-foreground`, `text-accent-foreground`, `text-popover-foreground`, `text-destructive-foreground`, `text-sidebar-foreground`
- **Borders**: `border-border`, `border-card`, `border-input`, `border-ring`, `border-primary`, `border-secondary`, `border-destructive`, `border-sidebar-border`

#### Glass Classes

The project uses a glass-morphism design system. Use these classes for surfaces and interactive elements:

| Class | Use for |
|---|---|
| `glass` | Default surface (cards, panels, containers) |
| `glass-subtle` | Minimal/transparent surfaces (inline elements, backgrounds) |
| `glass-solid` | Opaque surfaces (modals, dropdowns, popovers) |
| `glass-hover` | Any interactive element that needs hover feedback |
| `glass-selected` | Active/selected state (selected list item, active tab) |
| `glass-selected-hover` | Selected items that are also hoverable |

**Typical combinations:**

```
<!-- Clickable card -->
<div class="glass glass-hover rounded-lg p-3">

<!-- List item with selection -->
<div class="glass-subtle glass-hover rounded-md p-2"        <!-- unselected -->
     class="glass-selected glass-selected-hover rounded-md p-2"> <!-- selected -->

<!-- Static container -->
<div class="glass rounded-lg p-4">
```

#### Icons in Components

- **Put icons inside buttons** — icons should accompany actions (`<Button><Icon /> Label</Button>`)
- **Do NOT add icons to every item in a list** — if every row would show the same icon, it is visual noise and should be omitted
- **Icons are acceptable in lists** only when they differentiate between item types (e.g. file type icons, status icons)
- **Do NOT use decorative icons** that don't convey additional information

## Key Type Definitions

- Agent types: `src/components/agents/types.ts`
- Repository/Command types: `src/components/repos/types.ts`
- Jarvis config types: `src/components/jarvis/config-types.ts`
- Rust types: `src-tauri/src/types.rs`

## Documentation

- `BUSINESS_MODEL.md` - Product vision and architecture (Portuguese)
- `docs/agent-executor.md` - Agent architecture and bridge protocols (Portuguese)
- `README.md` - Project setup (Portuguese)
