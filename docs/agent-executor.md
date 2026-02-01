# Overseer — Executor de Agentes de IA (Visão e Arquitetura)

## Visão geral

O Overseer deixa de ser apenas um executor de comandos e passa a ser um **orquestrador de agentes de IA**, com observabilidade total do que cada agente faz (comandos, edições, pesquisas) e com **modo seguro** (aprovação manual) ou **modo automático**.

A home vira um **painel de agentes**, com vários cards mostrando agentes rodando em paralelo, status e logs em tempo real.

---

## Objetivos do produto

- **Controlar CLIs de IA pelo app** (Codex CLI, Claude Code, Gemini Code etc.)
- **Suportar agentes locais e via API**
- **Permitir aprovações manuais por ação** (modo seguro)
- **Subir dev servers locais** com logs e controle (start/stop)
- **UI 100% guiada**: aprovar, rejeitar, pausar, retomar

---

## Conceitos principais

### Agent

Representa um “worker” de IA.

- id, name
- provider (cli, local, api)
- model/config
- status (idle, planning, running, waiting_approval, error)
- repos vinculados (relação N–N)

### Session

Uma sessão é um objetivo/execução completa.

- id, agent_id
- goal
- state (active, done, failed)
- timestamps

### Action

Tudo que o agente faz vira uma ação.

- id, session_id
- type (run_command, edit_file, read_file, search_web, start_dev_server, etc.)
- status (pending, running, done, failed, blocked)
- payload (params da ação)

### Approval

Quando em modo seguro, ações ficam bloqueadas até aprovação.

- id, action_id
- state (pending, approved, rejected)
- reviewer, timestamp

### Event

Linha de tempo de tudo que acontece.

- id, agent_id, session_id
- level, message, timestamp
- source (tool, cli, system)

### Artifact

Logs, diffs, outputs, anexos.

---

## Providers de IA

### 1) CLI Provider (controle via app)

Objetivo: rodar CLIs (Codex, Claude Code, Gemini Code) **sob controle do Overseer**.

**Estratégia:**

- O Overseer inicia o CLI como processo filho (PTY).
- Toda entrada/saída passa pelo app (stdin/stdout).
- O CLI não executa comandos diretamente: ele **pede ações**.
- O Overseer executa as ações e responde ao CLI.

**Resultado:**

- O Overseer controla cada passo.
- Modo seguro funciona (aprovação antes de executar).

> Se o CLI não suporta tool-proxy nativamente, podemos usar um wrapper/bridge que interpreta a conversa e converte em ações.

---

## Protocolo do CLI Bridge (Overseer Agent Bridge)

Objetivo: controlar qualquer CLI via mensagens estruturadas. Formato simples e debuggável: **JSON por linha** (NDJSON) via stdin/stdout.

### Nomes finais das mensagens

**Direção CLI → Overseer**

- `hello`
- `log`
- `plan`
- `action.request`
- `action.cancel`
- `session.end`
- `ping`

**Direção Overseer → CLI**

- `hello.ack`
- `action.result`
- `approval.requested`
- `approval.result`
- `session.set_mode`
- `pong`

### Campos padrão (todas as mensagens)

- `type`: string (nome da mensagem)
- `id`: string (id da mensagem)
- `sessionId`: string
- `agentId`: string
- `timestamp`: string (ISO)

### Campos por tipo

**hello (CLI → Overseer)**

- `cli`: string
- `version`: string
- `capabilities`: string[] (ex: `["actions","plan","stream"]`)

**hello.ack (Overseer → CLI)**

- `protocol`: string (ex: `cab/1.0`)
- `mode`: `safe | auto`
- `workspace`: string (path)

**log (CLI → Overseer)**

- `level`: `debug | info | warn | error`
- `message`: string

**plan (CLI → Overseer)**

- `items`: string[]

**action.request (CLI → Overseer)**

- `action`: `{ type: string, payload: object, summary?: string }`

**action.cancel (CLI → Overseer)**

- `actionId`: string
- `reason?`: string

**action.result (Overseer → CLI)**

- `actionId`: string
- `status`: `ok | failed | blocked | rejected`
- `output?`: string
- `error?`: string

**approval.requested (Overseer → CLI)**

- `approvalId`: string
- `actionId`: string
- `summary`: string

**approval.result (Overseer → CLI)**

- `approvalId`: string
- `state`: `approved | rejected`
- `reason?`: string

**session.set_mode (Overseer → CLI)**

- `mode`: `safe | auto`

**session.end (CLI → Overseer)**

- `state`: `done | failed | aborted`
- `summary?`: string

**ping/pong**

- `ping` (CLI → Overseer) / `pong` (Overseer → CLI)

### Handshake

O Overseer inicia o processo e envia:

```json
{
  "type": "hello",
  "id": "m-1",
  "sessionId": "s-123",
  "agentId": "a-1",
  "timestamp": "2026-01-30T12:00:00Z",
  "cli": "claude-code",
  "version": "1.2.0",
  "capabilities": ["actions", "plan", "stream"]
}
```

O CLI responde:

```json
{
  "type": "hello.ack",
  "id": "m-2",
  "sessionId": "s-123",
  "agentId": "a-1",
  "timestamp": "2026-01-30T12:00:01Z",
  "protocol": "cab/1.0",
  "mode": "safe",
  "workspace": "/path"
}
```

### Mensagens principais

```json
{"type":"log","id":"m-3","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:10Z","level":"info","message":"Iniciando plano..."}
{"type":"plan","id":"m-4","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:11Z","items":["Rodar tests","Subir dev server"]}
{"type":"action.request","id":"m-5","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:12Z","action":{"type":"run_command","payload":{"repo":"app","command":"pnpm test"},"summary":"Rodar testes"}}
{"type":"action.request","id":"m-6","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:13Z","action":{"type":"edit_file","payload":{"path":"src/app.tsx","diff":"@@ ..."},"summary":"Ajustar header"}}
{"type":"action.request","id":"m-7","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:14Z","action":{"type":"search_web","payload":{"query":"..."},"summary":"Pesquisar dependência"}}
```

### Respostas do Overseer

```json
{"type":"action.result","id":"m-8","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:20Z","actionId":"act-1","status":"ok","output":"..."}
{"type":"action.result","id":"m-9","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:21Z","actionId":"act-2","status":"rejected","error":"Aprovacao negada"}
{"type":"action.result","id":"m-10","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:22Z","actionId":"act-3","status":"blocked","error":"Aguardando aprovacao"}
```

### Aprovações

```json
{"type":"approval.requested","id":"m-11","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:23Z","approvalId":"appr-1","actionId":"act-3","summary":"search_web: ..."}
{"type":"approval.result","id":"m-12","sessionId":"s-123","agentId":"a-1","timestamp":"2026-01-30T12:00:30Z","approvalId":"appr-1","state":"approved"}
```

### Observações

- **Modo seguro**: `request_action` vira `approval_requested` e fica bloqueado até o usuário aprovar.
- **Modo automático**: `request_action` executa direto.
- **Fallback**: se o CLI não suportar o protocolo, usamos um **wrapper** que interpreta texto e transforma em ações, mas com menos precisão.

---

### 2) Local Model Provider

Ex: Ollama, LM Studio. O modelo chama tools internos do app.

### 3) API Provider

Ex: OpenAI, Anthropic, Google. Mesmo fluxo de tools.

---

## Modo seguro vs automático

### Modo seguro (manual)

Exige aprovação para:

- comandos no terminal
- edições de código
- pesquisa na internet
- qualquer ação que CLI peça

UI oferece botões de **Approve/Reject** e histórico do que foi pedido.

### Modo automático

Ações executam direto, mas tudo fica registrado na timeline.

---

## Fluxo de approvals (UI + estados)

### Estados de Approval

- `pending`: aguardando decisão do usuário
- `approved`: aprovado
- `rejected`: rejeitado
- `expired`: expirou sem ação (opcional)
- `canceled`: cancelado pelo agente (opcional)

### Estados de Action (relacionados)

- `pending`: aguardando execução
- `blocked`: aguardando approval
- `running`: em execução
- `done`: sucesso
- `failed`: falhou
- `rejected`: reprovado pelo usuário

### Regras de criação

- Em modo **safe**, qualquer `action.request` gera `Approval` com estado `pending` e `Action` vai para `blocked`.
- Em modo **auto**, `Action` vai direto para `running`.

### UI: onde aprovar

**1) AgentCard (rápido)**
Badge “Waiting approval” + botões **Approve / Reject** para a última ação pendente.

**2) Approval Drawer (detalhado)**
Lista de approvals com:

- tipo da ação (`run_command`, `edit_file`, `search_web`…)
- resumo + preview do payload
- diffs (quando edit_file)
- comando completo (quando run_command)
- botões Approve / Reject / Edit & Approve (opcional)

### Fluxo detalhado (safe mode)

1. CLI envia `action.request`.
2. Overseer cria `Action` (`blocked`) e `Approval` (`pending`).
3. UI mostra badge “Waiting approval”.
4. Usuário **Approve**:
   - `Approval` → `approved`
   - `Action` → `running` → `done/failed`
   - Overseer envia `approval.result` para o CLI.
5. Usuário **Reject**:
   - `Approval` → `rejected`
   - `Action` → `rejected`
   - Overseer envia `approval.result` para o CLI.

### Fluxo automático

1. CLI envia `action.request`.
2. Overseer cria `Action` (`running`).
3. Executa imediatamente.
4. Envia `action.result` para o CLI.

### UX sugerida (micro)

- Pending approval mostra preview do impacto.
- Se `edit_file`, mostrar diff + botão “Abrir arquivo”.
- Se `run_command`, mostrar o comando e cwd.
- Se `search_web`, mostrar a query.

---

## Actions permitidas (type) e payloads padrão

### Lista consolidada de `action.type`

**Execução**

- `run_command`
- `start_dev_server`
- `stop_dev_server`

**Arquivos**

- `read_file`
- `write_file`
- `edit_file`
- `list_files`
- `delete_file`

**Pesquisa / Navegação**

- `search_web`
- `open_url`

**Git (opcional)**

- `git_status`
- `git_diff`
- `git_checkout`
- `git_commit`

**Utilidades**

- `sleep`
- `notify`

> Observação: ações “git” podem ser mapeadas para `run_command` se quisermos manter um núcleo mínimo no início.

### Payloads padrão (schema sugerido)

#### `run_command`

```json
{
  "repo": "app",
  "command": "pnpm test",
  "cwd": "/path/opcional",
  "env": { "KEY": "VALUE" }
}
```

#### `start_dev_server`

```json
{
  "repo": "app",
  "command": "pnpm dev",
  "cwd": "/path/opcional",
  "env": { "PORT": "5173" },
  "portHint": 5173
}
```

#### `stop_dev_server`

```json
{
  "repo": "app",
  "target": "last|pid|command",
  "pid": 1234,
  "command": "pnpm dev"
}
```

#### `read_file`

```json
{
  "path": "src/app.tsx",
  "startLine": 1,
  "endLine": 200
}
```

#### `write_file`

```json
{
  "path": "src/app.tsx",
  "content": "conteudo completo aqui",
  "mode": "overwrite|append"
}
```

#### `edit_file`

```json
{
  "path": "src/app.tsx",
  "diff": "@@ ...",
  "format": "unified"
}
```

#### `list_files`

```json
{
  "path": ".",
  "recursive": true,
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules/**", "dist/**"]
}
```

#### `delete_file`

```json
{
  "path": "src/old.ts"
}
```

#### `search_web`

```json
{
  "query": "tauri event emit example",
  "recencyDays": 30
}
```

#### `open_url`

```json
{
  "url": "https://example.com",
  "mode": "headless|preview"
}
```

#### `git_status`

```json
{
  "repo": "app"
}
```

#### `git_diff`

```json
{
  "repo": "app",
  "path": "src/app.tsx",
  "staged": false
}
```

#### `git_checkout`

```json
{
  "repo": "app",
  "branch": "feature-x"
}
```

#### `git_commit`

```json
{
  "repo": "app",
  "message": "feat: update header"
}
```

#### `sleep`

```json
{
  "ms": 1000
}
```

#### `notify`

```json
{
  "level": "info",
  "message": "Build finalizado"
}
```

### Regras gerais

- `repo` é obrigatório quando a ação afeta um repositório.
- `cwd` é opcional e deve sobrescrever o path do repo quando informado.
- `env` sempre mergeia com o ambiente padrão (não substitui tudo).
- `edit_file` deve ser preferido a `write_file` quando possível (melhor diffs + approvals).

---

## UI (refatoração completa)

### Home = Agents

Grid de cards (1 por agente). Cada card mostra:

- Nome do agente
- Repo + branch atual
- Status badges (planning/running/waiting_approval/error)
- Task atual (linha curta)
- **Terminal collapsible** com logs
- Botões: Approve / Reject / Pause / Stop

### Outras telas

- **Sessions**: histórico de objetivos e execuções
- **Runs**: timeline global de ações
- **Repos**: cadastro e presets de execução
- **Settings**: providers, modelos, chaves, políticas

---

## Wireframe textual (Home = Agents)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Overseer · Agents                               [Safe Mode ☐]        │
│ [New Agent] [New Session] [Settings]                                │
└──────────────────────────────────────────────────────────────────────┘

┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Agent: Luna   │ │ Agent: Kai    │ │ Agent: Nova   │
│ repo: webapp  │ │ repo: api     │ │ repo: infra   │
│ branch: main  │ │ branch: dev   │ │ branch: prod  │
│ [running]     │ │ [waiting]     │ │ [planning]    │
│ Task: "fix..."│ │ Task: "test"  │ │ Task: "plan"  │
│               │ │               │ │               │
│ ▸ Terminal    │ │ ▾ Terminal    │ │ ▸ Terminal    │
│               │ │  > npm test   │ │               │
│ [Approve] ... │ │ [Approve] ... │ │ [Pause] [Stop]│
└───────────────┘ └───────────────┘ └───────────────┘

Lateral (opcional): Timeline global com filtros por agente/repo.
```

**Componentes-chave:**

- **AgentCard**: badges, task, repo/branch, actions e collapsible de logs.
- **ApprovalDrawer**: lista de ações pendentes com diff/command preview.
- **SessionPanel**: objetivos, progresso e etapas.

---

## Subir projetos (dev server local)

Ações específicas:

- `start_dev_server`
- `stop_dev_server`

Recursos:

- detecção de porta (já existe)
- status do server
- botão “Open in browser”
- logs ao vivo no card do agente

---

## Modelagem de dados (sugestão)

Entidades básicas:

- Agent
- Session
- Action
- Approval
- Event
- Artifact
- Repo

Relações:

- Agent N–N Repo
- Agent 1–N Session
- Session 1–N Action
- Action 0–1 Approval
- Action 1–N Event

---

## Eventos em tempo real

Manter um canal de eventos (Tauri events):

- agent://status
- action://queued
- action://running
- action://finished
- approval://requested
- approval://resolved

---

## Mapeamento para o schema SQLite (proposta)

O banco atual cobre `repositories`, `commands`, `execution_history`, `execution_queue` e `execution_logs`.
Para suportar agentes, adicionamos tabelas novas (sem quebrar as atuais).

### Novas tabelas

```sql
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,         -- cli | local | api
  model TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_repos (
  agent_id TEXT NOT NULL,
  repo TEXT NOT NULL,
  PRIMARY KEY (agent_id, repo),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (repo) REFERENCES repositories(name) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,          -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  action_id TEXT NOT NULL,
  state TEXT NOT NULL,
  reviewer TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  agent_id TEXT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,           -- tool | cli | system
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL,             -- log | diff | file | output
  data TEXT NOT NULL,             -- JSON/blob base64
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

### Integração com o schema atual

- `repositories` continuam a existir como base.
- `agent_repos` cria a relação N–N entre agente e repo.
- `execution_history` permanece para execuções de comandos (e pode referenciar `session_id` no futuro, se quisermos).

---

---

## Roadmap sugerido

1. Criar entidades Agent/Session/Action no backend
2. Eventos em tempo real no Tauri
3. Refatorar UI para Home = Agents
4. Implementar sistema de aprovação
5. Integrar provider CLI com controle via app
6. Integrar provider API

---

## Decisões já confirmadas

- CLI controlado pelo app (tool-proxy/bridge)
- Relação N–N entre agentes e repos
- Documentação em PT‑BR
- Nova UI focada em agentes

---

## Próximos passos

- Definir protocolo do CLI bridge (mensagens e actions)
- Desenhar o layout final dos cards
- Mapear APIs de providers (CLI/local/API)
