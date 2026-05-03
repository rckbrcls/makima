# Makima Desktop

> **Status:** Active
> Tauri + React desktop app for controlling local AI coding sessions.

## Summary

- Active Tauri + React desktop app for controlling local AI coding sessions.
- Solves local repository/session management, conversations, CLI terminal cards, provider configuration, Git status, and native command bridging.
- Main stack: React 19, TypeScript, Vite, TanStack Router/Start, Tauri 2, Supabase client, xterm, Three.js/React Three Fiber, Zustand, and Vitest.
- Current status: active desktop surface in the Makima repository.
- Technical value: demonstrates a local-first desktop control plane where React owns UI/state and Tauri owns native execution and persistence.

Desktop surface for Makima. It owns local repositories, conversations, terminal/CLI session UI, provider configuration, Git status, and the bridge to native Tauri commands.

## Features

- Chat and code-session tabs.
- Repository sidebar and add-repository flow.
- CLI terminal cards and toolbar.
- Conversation sidebar, thread, composer, and run details modal.
- Provider hooks for Anthropic, OpenAI, and Ollama.
- Local state hooks for conversations, repositories, CLI sessions, Git status, and terminals.
- Tauri-backed storage and native capabilities.

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Router/Start
- Tauri 2
- Supabase client
- xterm
- Three.js / React Three Fiber
- Zustand
- Vitest

## Getting Started

Install dependencies from this package directory or through the repository workflow. The runnable scripts are declared in `package.json`; agent sessions in this workspace should document commands instead of executing dev or build commands.

## Usage

Primary package scripts:

- `pnpm dev` / `pnpm tauri:dev` start the Tauri desktop workflow.
- `pnpm build` / `pnpm tauri:build` create production builds.
- `pnpm dev:vite` starts only the Vite frontend.
- `pnpm test`, `pnpm lint`, `pnpm format`, and `pnpm check` cover local checks.

## Project Structure

```text
makima-desktop/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   └── router.tsx
├── src-tauri/
└── package.json
```

## Architecture

React owns the interactive desktop UI and state hooks. Tauri owns native execution, database, filesystem, Git, provider, Ollama, auth, and PTY commands under `src-tauri`. The desktop app is the local execution owner; mobile and relay behavior should not bypass its permissions or session model.

## Technical Highlights

- `src/lib/diff-engine.ts` has a colocated test.
- `src/lib/tauri-storage.ts` separates storage integration from components.
- `routeTree.gen.ts` indicates generated TanStack Router route metadata is present in the source tree.
