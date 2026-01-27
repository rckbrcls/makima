import type { ElementType } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  CircleDot,
  Clock,
  FolderGit2,
  GitBranch,
  Hammer,
  Package,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
  Terminal,
  Zap,
} from "lucide-react"

const repositories = [
  {
    name: "commander",
    path: "~/codes/commander",
    branch: "main",
    status: "active",
    tech: ["tauri", "react", "vite"],
    lastRun: "agora",
    running: "dev: tauri",
  },
  {
    name: "billing-api",
    path: "~/codes/billing-api",
    branch: "release/2026.01",
    status: "idle",
    tech: ["node", "prisma"],
    lastRun: "20 min",
    running: "-",
  },
  {
    name: "ui-kit",
    path: "~/codes/ui-kit",
    branch: "design-refresh",
    status: "warn",
    tech: ["storybook", "ts"],
    lastRun: "ontem",
    running: "tests",
  },
]

const commands = [
  {
    name: "Dev (Tauri)",
    command: "pnpm tauri dev",
    type: "run",
    status: "running",
    duration: "02:14",
    lastRun: "agora",
  },
  {
    name: "Build Desktop",
    command: "pnpm tauri build",
    type: "build",
    status: "idle",
    duration: "-",
    lastRun: "3h",
  },
  {
    name: "Testes",
    command: "pnpm test",
    type: "test",
    status: "queued",
    duration: "-",
    lastRun: "ontem",
  },
  {
    name: "Lint",
    command: "pnpm lint",
    type: "lint",
    status: "success",
    duration: "00:42",
    lastRun: "30 min",
  },
  {
    name: "Typecheck",
    command: "pnpm tsc --noEmit",
    type: "check",
    status: "failed",
    duration: "01:12",
    lastRun: "2h",
  },
  {
    name: "Bundle Assets",
    command: "pnpm build:assets",
    type: "bundle",
    status: "idle",
    duration: "-",
    lastRun: "nunca",
  },
]

const runQueue = [
  {
    name: "Build Desktop",
    repo: "commander",
    eta: "~3 min",
  },
  {
    name: "Testes",
    repo: "billing-api",
    eta: "~8 min",
  },
  {
    name: "Storybook",
    repo: "ui-kit",
    eta: "~5 min",
  },
]

const pipeline = [
  { label: "Instalar deps", state: "done" },
  { label: "Preparar env", state: "done" },
  { label: "Compilar frontend", state: "running" },
  { label: "Empacotar desktop", state: "pending" },
]

const statusStyles: Record<string, string> = {
  running: "border-chart-2/50 bg-chart-2/15 text-chart-2",
  queued: "border-chart-4/50 bg-chart-4/15 text-chart-4",
  success: "border-chart-1/50 bg-chart-1/15 text-chart-1",
  failed: "border-destructive/40 bg-destructive/15 text-destructive",
  idle: "border-border bg-muted/60 text-muted-foreground",
}

const typeIcons: Record<string, ElementType> = {
  run: Play,
  build: Hammer,
  test: Activity,
  lint: Zap,
  check: AlertTriangle,
  bundle: Package,
}

export function CommandHub() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_82%_8%,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_72%_78%,rgba(248,113,113,0.15),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-[float_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-20 bottom-12 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-[float_14s_ease-in-out_infinite]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center border border-border/70 bg-card/70 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                <Terminal className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground">
                  Painel de comandos
                </p>
                <h1 className="text-2xl font-semibold">Commander</h1>
                <p className="text-xs text-muted-foreground">
                  Orquestre build, run e deploy por repositorio em um so lugar.
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 min-[480px]:flex-nowrap">
              <div className="relative w-full min-w-[220px] max-w-sm">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar comandos, repos ou tags"
                  className="h-9 border-border bg-background/80 pl-8 text-xs shadow-sm"
                />
              </div>
              <ModeToggle />
              <Button variant="outline" className="h-9 border-border bg-card/70 text-xs">
                <Sparkles data-icon="inline-start" />
                Auto-setup
              </Button>
              <Button className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus data-icon="inline-start" />
                Novo repo
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Repos ativos", value: "3", note: "1 rodando" },
              { label: "Comandos prontos", value: "24", note: "6 favoritos" },
              { label: "Execucoes hoje", value: "18", note: "96% sucesso" },
            ].map((item, index) => (
              <Card
                key={item.label}
                className={cn(
                  "border-border/70 bg-card/80 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur animate-in fade-in slide-in-from-bottom-6 duration-700",
                  index === 0 && "delay-100",
                  index === 1 && "delay-200",
                  index === 2 && "delay-300"
                )}
              >
                <CardHeader className="border-b border-border/60">
                  <CardDescription className="uppercase tracking-[0.3em] text-[0.55rem] text-muted-foreground">
                    {item.label}
                  </CardDescription>
                  <CardTitle className="text-2xl text-foreground">{item.value}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-[0.7rem] text-muted-foreground">
                  <span>{item.note}</span>
                  <ChevronRight className="size-4 text-muted-foreground/70" />
                </CardContent>
              </Card>
            ))}
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          <aside className="flex flex-col gap-4">
            <Card className="border-border/60 bg-card/85 shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FolderGit2 className="size-4 text-primary" />
                  Repositorios
                </CardTitle>
                <CardDescription>Selecione para ver comandos ativos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {repositories.map((repo) => (
                  <div
                    key={repo.name}
                    className={cn(
                      "group flex flex-col gap-2 border border-transparent bg-muted/70 p-3 transition",
                      repo.status === "active"
                        ? "border-border/70 bg-card/90 shadow-[0_10px_18px_rgba(15,23,42,0.08)]"
                        : "hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{repo.name}</p>
                        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                          <GitBranch className="size-3" />
                          {repo.branch}
                        </div>
                      </div>
                      <CircleDot
                        className={cn(
                          "size-3",
                          repo.status === "active" && "text-chart-1",
                          repo.status === "idle" && "text-muted-foreground/70",
                          repo.status === "warn" && "text-chart-4"
                        )}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {repo.tech.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="border-border bg-card/70 text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[0.6rem] text-muted-foreground">
                      <span>ultimo: {repo.lastRun}</span>
                      <span className="text-foreground/80">corre: {repo.running}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/85 shadow-[0_14px_24px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-sm">Batches salvos</CardTitle>
                <CardDescription>Sequencias que voce roda com um clique.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {["build + tests", "publish nightly", "release candidate"].map(
                  (batch) => (
                    <div
                      key={batch}
                      className="flex items-center justify-between border border-border/60 bg-accent/60 px-3 py-2"
                    >
                      <span className="uppercase tracking-[0.2em] text-[0.6rem] text-muted-foreground">
                        {batch}
                      </span>
                      <Button variant="outline" size="xs" className="h-6">
                        <Play data-icon="inline-start" />
                        Rodar
                      </Button>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </aside>

          <section className="flex flex-col gap-4">
            <Card className="border-border/60 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Terminal className="size-4 text-primary" />
                  commander | comandos principais
                </CardTitle>
                <CardDescription>
                  Todo comando e executado em background com feedback ao vivo.
                </CardDescription>
                <CardAction>
                  <Button variant="outline" size="sm" className="border-border bg-card/80">
                    <Square data-icon="inline-start" />
                    Parar tudo
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {commands.map((command, index) => {
                  const Icon = typeIcons[command.type]
                  return (
                    <Card
                      key={command.name}
                      size="sm"
                      className={cn(
                        "border-border/70 bg-card/80 shadow-[0_10px_20px_rgba(15,23,42,0.07)] animate-in fade-in slide-in-from-bottom-8 duration-700",
                        index % 2 === 0 ? "delay-200" : "delay-300"
                      )}
                    >
                      <CardHeader className="border-b border-border/60">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <span className="flex size-7 items-center justify-center border border-border bg-muted text-foreground/80">
                            <Icon className="size-4" />
                          </span>
                          {command.name}
                        </CardTitle>
                        <CardAction>
                          <Badge
                            variant="outline"
                            className={cn("text-[0.6rem] uppercase", statusStyles[command.status])}
                          >
                            {command.status}
                          </Badge>
                        </CardAction>
                        <CardDescription className="text-[0.7rem] text-muted-foreground">
                          {command.command}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                          <span>ultima execucao: {command.lastRun}</span>
                          <span className="text-foreground/80">tempo: {command.duration}</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden border border-border bg-muted">
                          <div
                            className={cn(
                              "h-full",
                              command.status === "running"
                                ? "w-3/4 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.8s_linear_infinite]"
                                : command.status === "queued"
                                ? "w-1/3 bg-chart-4/80"
                                : command.status === "failed"
                                ? "w-full bg-destructive/70"
                                : command.status === "success"
                                ? "w-full bg-chart-1/70"
                                : "w-0"
                            )}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="justify-between">
                        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                          <Clock className="size-3" />
                          agendado as 14:30
                        </div>
                        <Button size="xs" className="h-6 bg-primary text-primary-foreground hover:bg-primary/90">
                          <Play data-icon="inline-start" />
                          Rodar
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/85 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-sm">Composer rapido</CardTitle>
                <CardDescription>Monte comandos customizados por repo.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
                <div className="space-y-2">
                  <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    comando base
                  </label>
                  <Input
                    className="h-9 border-border bg-background/80 text-xs"
                    defaultValue="pnpm run"
                  />
                  <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    argumentos
                  </label>
                  <Input
                    className="h-9 border-border bg-background/80 text-xs"
                    placeholder="build --filter=desktop"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="border-border bg-card/70">
                      <Play data-icon="inline-start" />
                      Executar agora
                    </Button>
                    <Button variant="outline" size="sm" className="border-border bg-card/70">
                      <Plus data-icon="inline-start" />
                      Salvar comando
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    notas e variaveis
                  </label>
                  <Textarea
                    className="min-h-[124px] border-border bg-background/80 text-xs"
                    placeholder="ENV=production\nCACHE=false\n"
                  />
                  <div className="rounded-none border border-border/70 bg-accent/60 p-3 text-[0.65rem] text-muted-foreground">
                    Dica: use {"{{repo}}"} e {"{{branch}}"} para injetar contexto em tempo real.
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="flex flex-col gap-4">
            <Card className="border-border/70 bg-card/85 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="size-4 text-primary" />
                  Execucao ao vivo
                </CardTitle>
                <CardAction>
                  <Badge
                    variant="outline"
                    className="border-chart-2/50 bg-chart-2/15 text-[0.6rem] uppercase text-chart-2"
                  >
                    running
                  </Badge>
                </CardAction>
                <CardDescription>
                  commander | Dev (Tauri)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                  <span>PID 42301</span>
                  <span>CPU 38% | RAM 1.2GB</span>
                </div>
                <div className="h-1 w-full overflow-hidden border border-border bg-muted">
                <div className="h-full w-2/3 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-1/80 bg-[length:200%_100%] animate-[shimmer_2.6s_linear_infinite]" />
                </div>
                <div className="space-y-1 rounded-none border border-border bg-muted/80 p-3 text-[0.65rem] text-foreground">
                  <div>[14:32:10] x bundler ready</div>
                  <div>[14:32:12] x starting tauri dev</div>
                  <div>[14:32:18] x watching src/**/*</div>
                  <div className="text-chart-4">[14:32:23] x cache warmed in 4.1s</div>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" size="sm" className="border-border bg-card/70">
                  <Square data-icon="inline-start" />
                  Encerrar
                </Button>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Terminal data-icon="inline-start" />
                  Abrir log
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border/60 bg-card/85 shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-sm">Fila de execucoes</CardTitle>
                <CardDescription>O que vem depois no pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {runQueue.map((item) => (
                  <div key={item.name} className="space-y-1 border border-border bg-card/70 p-3">
                    <div className="flex items-center justify-between text-xs font-medium text-foreground">
                      <span>{item.name}</span>
                      <span className="text-[0.65rem] text-muted-foreground">{item.eta}</span>
                    </div>
                    <div className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                      {item.repo}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/85 shadow-[0_16px_28px_rgba(15,23,42,0.08)]">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-sm">Etapas do build</CardTitle>
                <CardDescription>Visual de progresso por passo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pipeline.map((step) => (
                  <div key={step.label} className="flex items-center justify-between text-xs">
                    <span className="text-foreground/80">{step.label}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[0.6rem] uppercase",
                        step.state === "done" && "border-chart-1/50 bg-chart-1/15 text-chart-1",
                        step.state === "running" && "border-chart-4/50 bg-chart-4/15 text-chart-4",
                        step.state === "pending" && "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {step.state}
                    </Badge>
                  </div>
                ))}
                <Separator className="bg-accent/70" />
                <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
                  <CircleDot className="size-3 text-chart-4" />
                  Build estimado para 14:41
                </div>
              </CardContent>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  )
}
