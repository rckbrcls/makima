# OpenClaw Orchestrator – Visão Geral do Produto

## Introdução

O **OpenClaw Orchestrator** é um aplicativo desktop **local-first** focado em orquestrar agentes de IA e execuções reais no computador do usuário.
Ele nasceu como uma interface para organizar comandos de terminal, mas evoluiu para um **orquestrador completo de agentes**, pipelines, skills e execuções observáveis.

O app não tenta abstrair o poder do terminal — ele **domestica** esse poder.

Tudo que o app faz acontece de verdade:

- comandos reais
- filesystem real
- código real
- agentes reais

O papel do app é dar **controle, visibilidade, segurança e escala** a isso.

---

## Visão de Produto

O OpenClaw Orchestrator é:

- Um **orquestrador de agentes locais**
- Um **runtime de execuções observáveis**
- Uma **interface humana para agentes que executam coisas reais**
- Um **sistema de controle remoto opcional** para o seu computador

Ele **não é**:

- um chatbot genérico
- um SaaS obrigatório
- um playground de prompts

---

## Componentes Principais

### 1. OpenClaw (Agent Runtime)

O **OpenClaw** é o motor de execução de agentes.

Características:

- Executa comandos de terminal
- Manipula filesystem
- Chama tools
- Pode rodar com:
  - modelos locais (Ollama, etc)
  - modelos via API (OpenAI, Anthropic, etc)
- Não possui memória longa
- Não possui histórico de conversas

O OpenClaw é **stateless por design**.
Ele recebe contexto, executa, responde e termina.

---

### 2. Orchestrator App (Este projeto)

O app é o **cérebro**, não o executor.

Responsabilidades:

- Gerenciar histórico de conversas
- Orquestrar execuções (Runs)
- Controlar permissões e políticas
- Oferecer UX rica
- Coordenar múltiplos agentes
- Fornecer observabilidade

O histórico **vive no app**, não no agent.

---

### 3. Chat-First UI

A interface principal do OpenClaw é **chat-first**.

- Estilo ChatGPT / Cursor
- Streaming de respostas
- Execuções aparecem como eventos no chat
- Terminal raw não é mostrado por padrão
- Cada conversa gera **Runs** rastreáveis

---

### 4. Histórico de Conversas

- Sidebar com lista de conversas
- Cada conversa contém:
  - mensagens
  - execuções
  - erros
- O histórico é local-first
- O agent não tem acesso direto ao histórico completo

O histórico serve para:

- UX
- auditoria
- replay
- controle humano

---

### 5. Runs / Executions

Tudo que executa vira um **Run**.

Um Run pode ser:

- um comando
- uma skill
- um pipeline
- uma execução disparada por agent

Cada Run possui:

- status
- logs
- duração
- artifacts
- contexto

Runs são o núcleo de observabilidade do app.

---

### 6. Skills

Skills são **receitas reutilizáveis**.

Uma Skill define:

- inputs
- contexto
- passos
- validações
- output esperado

Skills podem:

- chamar agentes
- rodar comandos
- compor pipelines

O runtime de skills é open source.
Skills avançadas podem ser monetizadas.

---

### 7. Jarvis / Claude Bot Integration

O app pode integrar com **clawdbot / Claude-like bots**, chamados de **Jarvis**.

Jarvis é:

- um agent com UX dedicada
- capaz de disparar runs
- capaz de usar skills
- capaz de pedir aprovação humana

Jarvis **não executa fora do controle do app**.

---

## Modelos de Execução de IA

O app suporta múltiplos modos:

- **Local-only**
  Modelos rodando na máquina

- **API-based**
  Usuário fornece sua API key

- **Hybrid**
  Planejamento via API + execução local

---

## Model Manager (Monetizável)

No modo Pro, o app oferece:

- Detecção automática da máquina
- Recomendação de modelos
- Presets (Fast, Smart, Power, Offline)
- Routing por tipo de task
- Fallback automático
- Cache local de respostas

O usuário não escolhe modelos.
Ele escolhe **intenção**.

---

## Segurança e Controle

O app implementa:

- Policies de execução
- Allowlist / blocklist de comandos
- Approval steps
- Dry-runs
- Audit logs
- Modo Safe / Full Power

Nada executa sem passar pelo orquestrador.

---

## Controle Remoto (Pro)

O app oferece controle remoto opcional via cloud:

- App mobile
- WhatsApp / Telegram / Slack
- Notificações
- Aprovações remotas
- Triggers de skills

Arquitetura:

- Desktop mantém conexão outbound
- Servidor apenas faz relay
- Nenhuma execução acontece no servidor

Controle remoto é **feature premium**.

---

## Monetização

### Open Source (Free)

- OpenClaw runtime
- Execução local
- Skills básicas
- Histórico local
- BYO model / BYO API key

### Pro (Local)

- Model Manager
- Skills avançadas
- Pipelines
- Replay de runs
- Observabilidade rica
- Segurança avançada

### Pro + Cloud

- Sync entre devices
- Controle remoto
- Mobile app
- Alertas
- Marketplace de skills

---

## Filosofia de Monetização

Nunca monetizar:

- execução básica
- uso local
- poder bruto

Sempre monetizar:

- conveniência
- controle
- escala
- segurança
- observabilidade

---

## Frase-Guia

> Agents executam.
> O app lembra, organiza e protege.

---

## Estado Atual

- UI com dados mockados
- Chat-first funcional
- Histórico navegável
- Execuções simuladas
- Configuração integrada via componente Expandable

---

## Próximos Passos

- Substituir mocks por runtime real
- Implementar event-driven execution
- Abrir o core como open source
- Lançar Pro local
- Evoluir cloud opcional

---

## Conclusão

O OpenClaw Orchestrator não tenta esconder o terminal.
Ele transforma o terminal em **infra organizada**, controlada por agentes, com UX humana e poder real.

Este projeto é a ponte entre:

- IA
- execução real
- controle humano
