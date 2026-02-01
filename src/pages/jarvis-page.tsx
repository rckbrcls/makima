import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TextureOverlay } from "@/components/ui/texture-overlay"
import { cn } from "@/lib/utils"
import {
  Activity,
  Bot,
  Brain,
  Calendar,
  Clock,
  Cloud,
  Database,
  Eye,
  FileText,
  GitBranch,
  Globe,
  Mail,
  Mic,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  Terminal,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const environmentOptions = [
  { value: "dev", label: "Dev" },
  { value: "staging", label: "Staging" },
  { value: "prod", label: "Prod" },
]

const languageOptions = [
  { value: "pt-BR", label: "pt-BR" },
  { value: "en-US", label: "en-US" },
  { value: "es-ES", label: "es-ES" },
]

const toneOptions = [
  { value: "balanced", label: "Balanced" },
  { value: "direct", label: "Direct" },
  { value: "creative", label: "Creative" },
  { value: "concise", label: "Concise" },
]

const providerOptions = [
  { value: "openclaw", label: "openClaw Cloud" },
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "local", label: "Local Runtime" },
]

const modelOptions = [
  { value: "claw-sonic", label: "Claw Sonic" },
  { value: "claw-vision", label: "Claw Vision" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "gpt-4o", label: "GPT-4o" },
]

const logLevelOptions = [
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
]

const toolDefaults = {
  fileRead: true,
  fileWrite: true,
  shell: false,
  git: true,
  browser: true,
  webSearch: true,
  memoryTools: true,
  vision: false,
  audio: false,
  calendar: false,
  email: false,
  database: false,
}

type ToolKey = keyof typeof toolDefaults

const toolItems: Array<{
  key: ToolKey
  label: string
  description: string
  icon: LucideIcon
}> = [
    { key: "fileRead", label: "File Read", description: "Leitura de arquivos e repos", icon: FileText },
    { key: "fileWrite", label: "File Write", description: "Criacao e edicao local", icon: Wrench },
    { key: "shell", label: "Shell", description: "Comandos e scripts", icon: Terminal },
    { key: "git", label: "Git", description: "Commit, diff e PRs", icon: GitBranch },
    { key: "browser", label: "Browser", description: "Navegacao assistida", icon: Globe },
    { key: "webSearch", label: "Web Search", description: "Busca e fontes externas", icon: Search },
    { key: "memoryTools", label: "Memory", description: "Vetores e resumo", icon: Database },
    { key: "vision", label: "Vision", description: "Analise visual", icon: Eye },
    { key: "audio", label: "Audio", description: "Input e output por voz", icon: Mic },
    { key: "calendar", label: "Calendar", description: "Agenda e lembretes", icon: Calendar },
    { key: "email", label: "Email", description: "Envio e leitura", icon: Mail },
    { key: "database", label: "Database", description: "SQL e conectores", icon: Database },
  ]

const safetyDefaults = {
  approvals: true,
  safeMode: true,
  redactPii: true,
  secretsScan: true,
  allowNetwork: false,
  sandboxWrite: true,
}

type SafetyKey = keyof typeof safetyDefaults

const automationDefaults = {
  schedules: true,
  webhooks: true,
  repoWatch: false,
  autoRecovery: true,
}

type AutomationKey = keyof typeof automationDefaults

const memoryDefaults = {
  shortTerm: true,
  longTerm: true,
  summarization: true,
  vectorIndex: true,
}

type MemoryKey = keyof typeof memoryDefaults

const integrationDefaults = {
  slack: false,
  github: true,
  jira: false,
  notion: false,
}

type IntegrationKey = keyof typeof integrationDefaults

const notificationDefaults = {
  desktop: true,
  email: false,
  incident: true,
}

type NotificationKey = keyof typeof notificationDefaults

interface ToggleCardProps {
  title: string
  description: string
  icon: LucideIcon
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function ToggleCard({ title, description, icon: Icon, checked, onCheckedChange }: ToggleCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-border/70 bg-background"
      )}
    >
      <div className="size-9 rounded-md border border-border bg-muted flex items-center justify-center">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

interface InlineToggleProps {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function InlineToggle({ label, description, checked, onCheckedChange }: InlineToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1">
        <span className="text-sm font-medium">{label}</span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function JarvisPage() {
  const [profileName, setProfileName] = useState("Jarvis")
  const [codename, setCodename] = useState("openClaw")
  const [environment, setEnvironment] = useState("dev")
  const [region, setRegion] = useState("us-east")
  const [language, setLanguage] = useState("pt-BR")
  const [tone, setTone] = useState("balanced")
  const [provider, setProvider] = useState("openclaw")
  const [model, setModel] = useState("claw-sonic")
  const [temperature, setTemperature] = useState("0.4")
  const [maxTokens, setMaxTokens] = useState("4096")
  const [contextWindow, setContextWindow] = useState("128k")
  const [systemPrompt, setSystemPrompt] = useState(
    "Voce e o Jarvis, um orquestrador do openClaw, focado em precisao e seguranca."
  )
  const [tools, setTools] = useState(toolDefaults)
  const [safety, setSafety] = useState(safetyDefaults)
  const [automation, setAutomation] = useState(automationDefaults)
  const [memory, setMemory] = useState(memoryDefaults)
  const [integrations, setIntegrations] = useState(integrationDefaults)
  const [notifications, setNotifications] = useState(notificationDefaults)
  const [logLevel, setLogLevel] = useState("info")
  const [traceSample, setTraceSample] = useState("15")
  const [runtimeConcurrency, setRuntimeConcurrency] = useState("3")
  const [executionTimeout, setExecutionTimeout] = useState("180")
  const [gpuEnabled, setGpuEnabled] = useState(false)

  const handleToolChange = (key: ToolKey, checked: boolean) => {
    setTools((prev) => ({ ...prev, [key]: checked }))
  }

  const handleSafetyChange = (key: SafetyKey, checked: boolean) => {
    setSafety((prev) => ({ ...prev, [key]: checked }))
  }

  const handleAutomationChange = (key: AutomationKey, checked: boolean) => {
    setAutomation((prev) => ({ ...prev, [key]: checked }))
  }

  const handleMemoryChange = (key: MemoryKey, checked: boolean) => {
    setMemory((prev) => ({ ...prev, [key]: checked }))
  }

  const handleIntegrationChange = (key: IntegrationKey, checked: boolean) => {
    setIntegrations((prev) => ({ ...prev, [key]: checked }))
  }

  const handleNotificationChange = (key: NotificationKey, checked: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: checked }))
  }

  return (
    <div className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">
      <TextureOverlay texture="noise" className="mix-blend-overlay" />

      <header className="relative z-10 flex flex-col gap-4 px-6 py-5 border-b border-border bg-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
            <Bot className="size-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Jarvis Console</h1>
              <Badge variant="outline" className="text-[10px]">openClaw</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Central de configuracoes do clawdbot para runtime, ferramentas e seguranca.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="size-4" />
            Sync
          </Button>
          <Button variant="outline" size="sm">Export JSON</Button>
          <Button size="sm" className="gap-2">
            <Rocket className="size-4" />
            Apply Config
          </Button>
        </div>
      </header>

      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 min-h-0 overflow-hidden px-6 p-6">
        <aside className="space-y-4 overflow-y-auto pr-1">
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="size-4" />
                Core Status
              </CardTitle>
              <CardDescription>Estado atual do openClaw</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  Conexao
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">Online</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Versao</span>
                <span className="font-medium">0.9.8</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ultimo sync</span>
                <span className="font-medium">2 min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Latencia media</span>
                <span className="font-medium">248 ms</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ambiente</span>
                <Badge variant="outline" className="text-[10px]">{environment}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="size-4" />
                Perfis Rapidos
              </CardTitle>
              <CardDescription>Aplicar presets instantaneos</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" size="sm">Modo Laboratorio</Button>
              <Button variant="outline" size="sm">Operacao Segura</Button>
              <Button variant="outline" size="sm">Alta Autonomia</Button>
              <Button variant="ghost" size="sm" className="justify-start text-muted-foreground">
                Gerenciar presets
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4" />
                Guardrails
              </CardTitle>
              <CardDescription>Politicas principais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Modo seguro</span>
                <Badge variant="outline" className={cn("text-[10px]", safety.safeMode ? "border-amber-400/40 text-amber-400" : "border-muted-foreground/30")}
                >
                  {safety.safeMode ? "Ativo" : "Desativado"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aprovacoes</span>
                <span className="font-medium">{safety.approvals ? "Manual" : "Auto"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rede externa</span>
                <span className="font-medium">{safety.allowNetwork ? "Permitido" : "Bloqueado"}</span>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="overflow-y-auto space-y-6 pr-2">
          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="size-4" />
                Identidade e Perfil
              </CardTitle>
              <CardDescription>Defina personalidade, ambiente e idioma do Jarvis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profileName">Nome do bot</Label>
                  <Input
                    id="profileName"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codename">Codename</Label>
                  <Input
                    id="codename"
                    value={codename}
                    onChange={(event) => setCodename(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select value={environment} onValueChange={setEnvironment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {environmentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Regiao</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tom</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {toneOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Instrucoes base para o comportamento do Jarvis.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="size-4" />
                  Modelo e Raciocinio
                </CardTitle>
                <CardDescription>Escolha o engine principal e limites</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperatura</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(event) => setTemperature(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      value={maxTokens}
                      onChange={(event) => setMaxTokens(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contextWindow">Context window</Label>
                  <Input
                    id="contextWindow"
                    value={contextWindow}
                    onChange={(event) => setContextWindow(event.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cloud className="size-4" />
                  Runtime e Recursos
                </CardTitle>
                <CardDescription>Limites do executor do openClaw</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="concurrency">Concorrencia</Label>
                    <Input
                      id="concurrency"
                      type="number"
                      value={runtimeConcurrency}
                      onChange={(event) => setRuntimeConcurrency(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Timeout (s)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={executionTimeout}
                      onChange={(event) => setExecutionTimeout(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Workspace permitido</Label>
                  <Input placeholder="/repos, /configs, /data" />
                </div>
                <InlineToggle
                  label="GPU assistida"
                  description="Ativa recursos GPU para tarefas pesadas"
                  checked={gpuEnabled}
                  onCheckedChange={setGpuEnabled}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="size-4" />
                Ferramentas e Acessos
              </CardTitle>
              <CardDescription>Habilite o que o Jarvis pode executar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {toolItems.map((tool) => (
                  <ToggleCard
                    key={tool.key}
                    title={tool.label}
                    description={tool.description}
                    icon={tool.icon}
                    checked={tools[tool.key]}
                    onCheckedChange={(checked) => handleToolChange(tool.key, checked)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="size-4" />
                  Memoria e Contexto
                </CardTitle>
                <CardDescription>Persistencia e resumo continuo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InlineToggle
                  label="Memoria curta"
                  description="Contexto da sessao atual"
                  checked={memory.shortTerm}
                  onCheckedChange={(checked) => handleMemoryChange("shortTerm", checked)}
                />
                <InlineToggle
                  label="Memoria longa"
                  description="Historico entre sessoes"
                  checked={memory.longTerm}
                  onCheckedChange={(checked) => handleMemoryChange("longTerm", checked)}
                />
                <InlineToggle
                  label="Resumos automaticos"
                  description="Compacta conversas longas"
                  checked={memory.summarization}
                  onCheckedChange={(checked) => handleMemoryChange("summarization", checked)}
                />
                <InlineToggle
                  label="Indice vetorial"
                  description="Busca semantica e retrieval"
                  checked={memory.vectorIndex}
                  onCheckedChange={(checked) => handleMemoryChange("vectorIndex", checked)}
                />
                <div className="space-y-2">
                  <Label>Dias de retencao</Label>
                  <Input type="number" defaultValue="30" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4" />
                  Automacoes
                </CardTitle>
                <CardDescription>Disparos e rotinas do clawdbot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InlineToggle
                  label="Schedules"
                  description="Executa jobs por cron"
                  checked={automation.schedules}
                  onCheckedChange={(checked) => handleAutomationChange("schedules", checked)}
                />
                <InlineToggle
                  label="Webhooks"
                  description="Recebe eventos externos"
                  checked={automation.webhooks}
                  onCheckedChange={(checked) => handleAutomationChange("webhooks", checked)}
                />
                <InlineToggle
                  label="Repo watch"
                  description="Observa commits e branches"
                  checked={automation.repoWatch}
                  onCheckedChange={(checked) => handleAutomationChange("repoWatch", checked)}
                />
                <InlineToggle
                  label="Auto recovery"
                  description="Reinicia fluxos falhos"
                  checked={automation.autoRecovery}
                  onCheckedChange={(checked) => handleAutomationChange("autoRecovery", checked)}
                />
                <div className="space-y-2">
                  <Label htmlFor="cron">Cron principal</Label>
                  <Input id="cron" placeholder="0 */6 * * *" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70 bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cloud className="size-4" />
                  Integracoes
                </CardTitle>
                <CardDescription>Conectores externos do openClaw</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InlineToggle
                  label="GitHub"
                  description="Repo sync e PRs"
                  checked={integrations.github}
                  onCheckedChange={(checked) => handleIntegrationChange("github", checked)}
                />
                <InlineToggle
                  label="Slack"
                  description="Alertas e comandos"
                  checked={integrations.slack}
                  onCheckedChange={(checked) => handleIntegrationChange("slack", checked)}
                />
                <InlineToggle
                  label="Jira"
                  description="Tickets e backlog"
                  checked={integrations.jira}
                  onCheckedChange={(checked) => handleIntegrationChange("jira", checked)}
                />
                <InlineToggle
                  label="Notion"
                  description="Docs e bases"
                  checked={integrations.notion}
                  onCheckedChange={(checked) => handleIntegrationChange("notion", checked)}
                />
                <div className="space-y-2">
                  <Label>Webhook base</Label>
                  <Input placeholder="https://hooks..." />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="size-4" />
                  Notificacoes
                </CardTitle>
                <CardDescription>Alertas e canais do Jarvis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InlineToggle
                  label="Desktop"
                  description="Notificacoes locais"
                  checked={notifications.desktop}
                  onCheckedChange={(checked) => handleNotificationChange("desktop", checked)}
                />
                <InlineToggle
                  label="Email"
                  description="Resumo diario"
                  checked={notifications.email}
                  onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                />
                <InlineToggle
                  label="Incident"
                  description="Avisos criticos"
                  checked={notifications.incident}
                  onCheckedChange={(checked) => handleNotificationChange("incident", checked)}
                />
                <div className="space-y-2">
                  <Label>Canal padrao</Label>
                  <Input placeholder="#jarvis-alerts" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4" />
                Seguranca e Aprovacoes
              </CardTitle>
              <CardDescription>Politicas e controles criticos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InlineToggle
                label="Aprovacoes manuais"
                description="Exige confirmacao para acoes sensiveis"
                checked={safety.approvals}
                onCheckedChange={(checked) => handleSafetyChange("approvals", checked)}
              />
              <InlineToggle
                label="Modo seguro"
                description="Bloqueia comandos destrutivos"
                checked={safety.safeMode}
                onCheckedChange={(checked) => handleSafetyChange("safeMode", checked)}
              />
              <InlineToggle
                label="Redacao de PII"
                description="Remove dados sensiveis nos logs"
                checked={safety.redactPii}
                onCheckedChange={(checked) => handleSafetyChange("redactPii", checked)}
              />
              <InlineToggle
                label="Scanner de segredos"
                description="Detecta chaves e tokens"
                checked={safety.secretsScan}
                onCheckedChange={(checked) => handleSafetyChange("secretsScan", checked)}
              />
              <InlineToggle
                label="Rede externa"
                description="Permite chamadas http externas"
                checked={safety.allowNetwork}
                onCheckedChange={(checked) => handleSafetyChange("allowNetwork", checked)}
              />
              <InlineToggle
                label="Sandbox de escrita"
                description="Restringe escrita fora do workspace"
                checked={safety.sandboxWrite}
                onCheckedChange={(checked) => handleSafetyChange("sandboxWrite", checked)}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cloud className="size-4" />
                Observabilidade
              </CardTitle>
              <CardDescription>Logs, traces e diagnosticos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nivel de log</Label>
                  <Select value={logLevel} onValueChange={setLogLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {logLevelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="traceSample">Trace sampling (%)</Label>
                  <Input
                    id="traceSample"
                    type="number"
                    value={traceSample}
                    onChange={(event) => setTraceSample(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endpoint de metrics</Label>
                <Input placeholder="http://localhost:9090/metrics" />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
