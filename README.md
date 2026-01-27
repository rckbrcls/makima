# Commander

Aplicacao desktop para orquestracao e gerenciamento de comandos de desenvolvimento. Permite gerenciar, executar e monitorar comandos de build, test e deploy de multiplos repositorios em uma unica interface.

## Sobre o Projeto

Commander e um painel de controle para desenvolvedores que trabalham com multiplos repositorios simultaneamente. Em vez de alternar entre terminais e projetos, o Commander centraliza todos os comandos em um hub unificado com monitoramento em tempo real, historico de execucoes e composicao de comandos customizados.

### Funcionalidades

- **Gerenciamento de Comandos** -- Visualizacao de todos os comandos organizados por repositorio, com status (running, queued, success, failed, idle), duracao e barra de progresso.
- **Monitoramento em Tempo Real** -- Acompanhamento de execucoes ativas com logs ao vivo, uso de CPU/RAM, PID do processo e botao para encerrar.
- **Fila de Execucao** -- Visualizacao de comandos enfileirados com tempo estimado e pipeline de steps de build.
- **Historico e Analytics** -- Registro de todas as execucoes passadas com taxa de sucesso, duracao media, detalhes de cada run e opcao de re-executar.
- **Composicao de Comandos** -- Interface para montar comandos customizados com comando base, argumentos, notas e injecao de contexto (`{{repo}}`, `{{branch}}`).
- **Gerenciamento de Repositorios** -- Sidebar com todos os repos, indicador de status (active, idle, warn), contagem de comandos rodando, branch atual e stack tecnologica.
- **Interface Responsiva** -- Layout adaptado para desktop (sidebar fixa) e mobile (menu lateral deslizante).
- **Tema Claro/Escuro** -- Alternancia entre temas com deteccao automatica de preferencia do sistema.

## Stack Tecnologica

### Frontend

| Tecnologia | Versao | Uso |
|---|---|---|
| React | 19.2 | Biblioteca de UI |
| TypeScript | 5.7 | Tipagem estatica |
| TanStack Start | 1.132 | Framework com file-based routing e SSR |
| Tailwind CSS | 4.0 | Estilizacao utility-first |
| Vite | 7.1 | Build tool e dev server |
| shadcn/ui | 3.7 | Componentes de interface |
| Radix UI | 1.4 | Primitivos acessiveis |
| Lucide React | 0.563 | Icones |

### Desktop

| Tecnologia | Versao | Uso |
|---|---|---|
| Tauri | 2.9 | Framework desktop (Rust) |
| Serde | 1.0 | Serializacao JSON (Rust) |

### Ferramentas de Desenvolvimento

| Tecnologia | Uso |
|---|---|
| Vitest | Testes unitarios |
| Testing Library | Testes de componentes |
| ESLint | Linting |
| Prettier | Formatacao de codigo |
| pnpm | Gerenciador de pacotes |

## Estrutura do Projeto

```
commander/
├── src/
│   ├── components/
│   │   ├── command-hub/          # Componentes principais da aplicacao
│   │   │   ├── index.tsx         # Componente raiz (CommandHub)
│   │   │   ├── commands-tab.tsx  # Aba de comandos
│   │   │   ├── execution-tab.tsx # Aba de execucao ao vivo
│   │   │   ├── history-tab.tsx   # Aba de historico
│   │   │   ├── compose-tab.tsx   # Aba de composicao de comandos
│   │   │   ├── command-card.tsx  # Card individual de comando
│   │   │   ├── live-execution-card.tsx  # Card de execucao ativa
│   │   │   ├── execution-queue-card.tsx # Card de fila
│   │   │   ├── build-steps-card.tsx     # Card de steps do pipeline
│   │   │   ├── history-list.tsx         # Lista de historico
│   │   │   ├── run-details-panel.tsx    # Painel de detalhes de um run
│   │   │   ├── repository-sidebar.tsx   # Sidebar de repositorios
│   │   │   ├── command-hub-header.tsx   # Header da aplicacao
│   │   │   ├── stats-cards.tsx          # Cards de estatisticas
│   │   │   ├── quick-composer.tsx       # Interface de composicao
│   │   │   └── types.ts                # Tipos TypeScript
│   │   └── ui/                   # Componentes shadcn/ui reutilizaveis
│   ├── hooks/
│   │   └── use-mobile.ts        # Hook de deteccao de viewport mobile
│   ├── lib/
│   │   ├── command-hub/
│   │   │   ├── helpers.ts       # Funcoes utilitarias (filtro, agrupamento, stats)
│   │   │   ├── constants.ts     # Estilos de status e mapeamento de icones
│   │   │   └── mock-data.ts     # Dados de demonstracao
│   │   └── utils.ts             # Utilitario cn() para classes Tailwind
│   ├── routes/
│   │   ├── __root.tsx           # Root route (HTML, providers, devtools)
│   │   └── index.tsx            # Rota principal (renderiza CommandHub)
│   ├── styles.css               # Estilos globais e variaveis de tema
│   └── router.tsx               # Configuracao do TanStack Router
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Entry point do Tauri
│   │   └── lib.rs               # Configuracao do app Tauri
│   ├── tauri.conf.json          # Config da janela e build do Tauri
│   ├── Cargo.toml               # Dependencias Rust
│   └── icons/                   # Icones do app desktop
├── public/                       # Assets estaticos
├── vite.config.ts               # Configuracao do Vite
├── tsconfig.json                # Configuracao do TypeScript
├── components.json              # Configuracao do shadcn/ui
├── eslint.config.js             # Configuracao do ESLint
└── prettier.config.js           # Configuracao do Prettier
```

## Arquitetura

O componente raiz `CommandHub` gerencia o estado global da aplicacao (repositorio selecionado, aba ativa) e distribui dados para quatro abas:

```
CommandHub
├── CommandHubHeader        # Busca, tema, acoes
├── RepositorySidebar       # Filtro por repositorio
├── Tabs
│   ├── CommandsTab         # Lista de comandos com status
│   ├── ExecutionTab        # Monitoramento ao vivo
│   ├── HistoryTab          # Historico de execucoes
│   └── ComposeTab          # Criacao de comandos
```

Os dados fluem de cima para baixo via props. Funcoes auxiliares em `lib/command-hub/helpers.ts` processam filtragem por repositorio, agrupamento e calculo de estatisticas. O sistema de temas usa CSS custom properties com color space oklch e e controlado pelo `ThemeProvider`.

Atualmente a aplicacao utiliza **dados mockados** (`mock-data.ts`) para demonstracao, com a arquitetura preparada para integracao com backend real.

## Como Executar

### Pre-requisitos

- Node.js
- pnpm
- Rust (para o build desktop com Tauri)

### Desenvolvimento (web)

```bash
pnpm install
pnpm dev
```

O servidor de desenvolvimento inicia em `http://localhost:3000`.

### Desenvolvimento (desktop)

```bash
pnpm install
pnpm tauri dev
```

### Build de Producao

```bash
pnpm build
```

### Testes

```bash
pnpm test
```

### Linting e Formatacao

```bash
pnpm lint          # Executar ESLint
pnpm format        # Executar Prettier
pnpm check         # Formatar + corrigir tudo
```

## Tipos Principais

```typescript
// Status de um repositorio
type RepositoryStatus = "active" | "idle" | "warn"

// Tipos de comando suportados
type CommandType = "run" | "build" | "test" | "lint" | "check" | "bundle"

// Status de execucao de um comando
type CommandStatus = "running" | "queued" | "success" | "failed" | "idle"

// Estados de um step do pipeline
type StepState = "done" | "running" | "pending"
```
