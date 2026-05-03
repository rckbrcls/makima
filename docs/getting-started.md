# Getting Started

## Requirements

- Node.js and pnpm for the desktop web layer.
- Rust toolchain required by Tauri.
- Xcode/iOS tooling for the mobile companion, if working on `makima-mobile`.
- Supabase CLI/project access for relay and edge-function work.
- Provider keys for OpenAI or Anthropic when using hosted model providers.

## Desktop Setup

From `makima/makima-desktop/`:

```bash
pnpm install
```

The package scripts define:

```bash
pnpm dev
pnpm dev:vite
pnpm tauri:dev
```

## Environment Setup

Copy `.env.example` to a local environment file and fill only the providers you use:

```bash
cp .env.example .env
```

Important variables:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Verification Scripts

The desktop package scripts define:

```bash
pnpm test
pnpm lint
pnpm build:vite
pnpm tauri:build
```

## Notes

- This documentation pass did not run install, dev, build, test, or lint commands.
- Keep execution ownership local to the desktop app.
