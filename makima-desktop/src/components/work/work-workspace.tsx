import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wrench,
  XCircle,
} from "lucide-react"
import { WorkApprovalBanner } from "./work-approval-banner"
import { WorkChat } from "./work-chat"
import { WorkConfigStudio } from "./work-config-studio"
import { WorkSetupWizard } from "./work-setup-wizard"
import type { Run } from "@/lib/work-types"
import {
  useOpenClawApprovals,
  useOpenClawCapabilities as useOpenClawCapabilitiesHook,
  useOpenClawRpc,
} from "@/hooks/openclaw"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  useOpenClawApprovalQueue,
  useOpenClawCapabilities,
  useOpenClawConnected,
  useOpenClawGatewayEvents,
  useOpenClawGatewayStatus,
  useOpenClawHealth,
  useOpenClawSetupComplete,
  useOpenClawToolsCatalog,
  useWorkActiveAgent,
  useWorkActiveSession,
  useWorkDomainActions,
  useWorkSessionRuns,
} from "@/stores"

export function WorkWorkspace() {
  const isConnected = useOpenClawConnected()
  const setupComplete = useOpenClawSetupComplete()
  const activeAgent = useWorkActiveAgent()
  const activeSession = useWorkActiveSession()
  const runs = useWorkSessionRuns()

  if (!setupComplete || !isConnected) {
    return <WorkSetupWizard />
  }

  return (
    <section className="border-border bg-background my-3 mr-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border">
      <Tabs defaultValue="run" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-3">
          <TabsList>
            <TabsTrigger value="run">Run</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="gateway">Gateway</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="run" className="min-h-0 flex-1">
          {!activeAgent ? (
            <EmptyState
              title="Select an agent to start"
              subtitle="Agents execute real commands and manipulate your filesystem"
            />
          ) : !activeSession ? (
            <EmptyState
              title={activeAgent.name}
              subtitle="Start a new session to begin execution"
            />
          ) : (
            <RunPanel runs={runs} />
          )}
        </TabsContent>

        <TabsContent value="approvals" className="min-h-0 flex-1">
          <ApprovalsPanel />
        </TabsContent>

        <TabsContent value="tools" className="min-h-0 flex-1">
          <ToolsPanel />
        </TabsContent>

        <TabsContent value="gateway" className="min-h-0 flex-1">
          <GatewayPanel />
        </TabsContent>

        <TabsContent value="config" className="min-h-0 flex-1">
          <WorkConfigStudio />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Bot className="mb-4 size-12 text-muted-foreground" />
      <p className="text-foreground text-sm">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
    </div>
  )
}

function RunPanel({ runs }: { runs: Array<Run> }) {
  const activeAgent = useWorkActiveAgent()
  const activeSession = useWorkActiveSession()

  if (!activeAgent || !activeSession) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground font-medium">{activeSession.title}</h3>
            <p className="text-muted-foreground text-xs">Agent: {activeAgent.name}</p>
          </div>
          <Badge
            className={cn(
              "border",
              activeSession.status === "active"
                ? "border-emerald-600 bg-emerald-900 text-emerald-300"
                : activeSession.status === "error"
                  ? "border-rose-600 bg-rose-900 text-rose-300"
                  : "border-border bg-muted text-muted-foreground",
            )}
          >
            {activeSession.status}
          </Badge>
        </div>
      </header>

      <WorkApprovalBanner />
      <WorkChat />

      {runs.length > 0 && (
        <div className="border-t border-border p-4">
          <h4 className="text-muted-foreground mb-2 text-xs font-medium">
            Runs ({runs.length})
          </h4>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ApprovalsPanel() {
  const approvals = useOpenClawApprovalQueue()
  const { loadApprovals, approve, reject } = useOpenClawApprovals()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await loadApprovals()
    } finally {
      setIsRefreshing(false)
    }
  }, [loadApprovals])

  useEffect(() => {
    handleRefresh().catch(() => {
      // Best effort.
    })
  }, [handleRefresh])

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Pending Approvals ({approvals.length})</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          Refresh
        </Button>
      </div>

      {approvals.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          No pending approvals
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto">
          {approvals.map((approval) => (
            <div key={approval.id} className="glass rounded-lg p-3">
              <p className="text-sm">{approval.action.description}</p>
              <code className="text-muted-foreground mt-1 block text-xs">
                {approval.action.payload}
              </code>
              <div className="mt-2 flex items-center justify-between">
                <Badge
                  className={cn(
                    "border",
                    approval.action.risk === "high"
                      ? "border-rose-600 bg-rose-900 text-rose-300"
                      : approval.action.risk === "medium"
                        ? "border-amber-600 bg-amber-900 text-amber-300"
                        : "border-emerald-600 bg-emerald-900 text-emerald-300",
                  )}
                >
                  {approval.action.risk}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-600 text-emerald-400"
                    onClick={() => approve(approval.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-600 text-rose-400"
                    onClick={() => reject(approval.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolsPanel() {
  const tools = useOpenClawToolsCatalog()
  const { setToolsCatalog } = useWorkDomainActions()
  const { listTools, invokeTool } = useOpenClawRpc()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [argsByTool, setArgsByTool] = useState<Partial<Record<string, string>>>({})
  const [resultByTool, setResultByTool] = useState<Record<string, string>>({})

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const nextTools = await listTools()
      setToolsCatalog(nextTools)
    } finally {
      setIsRefreshing(false)
    }
  }, [listTools, setToolsCatalog])

  useEffect(() => {
    handleRefresh().catch(() => {
      // Best effort.
    })
  }, [handleRefresh])

  const handleInvoke = useCallback(
    async (toolName: string) => {
      let parsedArgs: Record<string, unknown> | undefined
      const raw = argsByTool[toolName]

      if (raw?.trim()) {
        try {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            parsedArgs = parsed as Record<string, unknown>
          }
        } catch {
          setResultByTool((prev) => ({
            ...prev,
            [toolName]: "Invalid JSON arguments",
          }))
          return
        }
      }

      const result = await invokeTool(toolName, parsedArgs)
      setResultByTool((prev) => ({
        ...prev,
        [toolName]: JSON.stringify(result ?? { ok: false }, null, 2),
      }))
    },
    [argsByTool, invokeTool],
  )

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Tools ({tools.length})</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          Refresh
        </Button>
      </div>

      {tools.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          No tools exposed by gateway
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pb-2">
          {tools.map((tool) => (
            <div key={tool.name} className="glass space-y-2 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="size-4 text-sky-500" />
                  <span className="text-sm font-medium">{tool.name}</span>
                </div>
                {tool.risk && (
                  <Badge className="border border-border bg-muted text-muted-foreground">
                    {tool.risk}
                  </Badge>
                )}
              </div>
              {tool.description && (
                <p className="text-muted-foreground text-xs">{tool.description}</p>
              )}
              <Input
                placeholder='JSON args, ex: {"path":"README.md"}'
                value={argsByTool[tool.name] ?? ""}
                onChange={(e) =>
                  setArgsByTool((prev) => ({
                    ...prev,
                    [tool.name]: e.target.value,
                  }))
                }
                className="h-8 text-xs"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleInvoke(tool.name)}
                >
                  <Activity className="size-3" />
                  Invoke
                </Button>
              </div>
              {resultByTool[tool.name] && (
                <pre className="bg-background max-h-40 overflow-auto rounded p-2 text-xs text-muted-foreground">
                  {resultByTool[tool.name]}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GatewayPanel() {
  const connection = useOpenClawConnected()
  const status = useOpenClawGatewayStatus()
  const health = useOpenClawHealth()
  const capabilities = useOpenClawCapabilities()
  const events = useOpenClawGatewayEvents()

  const { setGatewayHealth } = useWorkDomainActions()
  const { getStatus, getHealth, ping } = useOpenClawRpc()
  const { refreshCapabilities } = useOpenClawCapabilitiesHook()

  const [statusPayload, setStatusPayload] = useState<Record<string, unknown> | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const sortedCapabilities = useMemo(() => {
    if (!capabilities) return []
    return Object.entries(capabilities).sort(([a], [b]) => a.localeCompare(b))
  }, [capabilities])

  const refreshRuntime = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [runtimeStatus, runtimeHealth] = await Promise.all([
        getStatus(),
        getHealth(),
      ])
      setStatusPayload(runtimeStatus)
      setGatewayHealth(runtimeHealth)
    } finally {
      setIsRefreshing(false)
    }
  }, [getHealth, getStatus, setGatewayHealth])

  useEffect(() => {
    refreshRuntime().catch(() => {
      // Best effort.
    })
  }, [refreshRuntime])

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-hidden p-4 lg:grid-cols-2">
      <div className="space-y-3 overflow-y-auto">
        <div className="glass rounded-lg p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Gateway Runtime</h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={refreshRuntime}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Refresh
            </Button>
          </div>

          <div className="space-y-1 text-xs">
            <p>
              Connection: {connection ? "connected" : "disconnected"}
            </p>
            <p>
              Gateway process: {status?.isRunning ? "running" : "stopped"}
              {status?.pid ? ` (PID ${status.pid})` : ""}
            </p>
            {health && (
              <p className={health.ok ? "text-emerald-400" : "text-rose-400"}>
                Health: {health.ok ? "ok" : "not healthy"}
                {health.status ? ` (${health.status})` : ""}
              </p>
            )}
          </div>

          {statusPayload && (
            <pre className="bg-background mt-2 max-h-48 overflow-auto rounded p-2 text-xs text-muted-foreground">
              {JSON.stringify(statusPayload, null, 2)}
            </pre>
          )}

          <div className="mt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => ping()}
              className="gap-1.5"
            >
              <Activity className="size-3" />
              Ping
            </Button>
          </div>
        </div>

        <div className="glass rounded-lg p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Capabilities</h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => refreshCapabilities()}
            >
              <RefreshCw className="size-3" />
              Probe
            </Button>
          </div>
          {sortedCapabilities.length === 0 ? (
            <p className="text-muted-foreground text-xs">No capability data yet</p>
          ) : (
            <div className="grid grid-cols-1 gap-1 text-xs">
              {sortedCapabilities.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{key}</span>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      value ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {value ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                    {value ? "yes" : "no"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass flex min-h-0 flex-col rounded-lg p-3">
        <h3 className="mb-2 text-sm font-medium">Gateway Event Stream</h3>
        {events.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
            Waiting for gateway events...
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {events
              .slice()
              .reverse()
              .map((event, index) => (
                <div key={`${event.seq}-${index}`} className="bg-background rounded p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <code className="text-xs text-sky-400">{event.event}</code>
                    <span className="text-muted-foreground text-xs">#{event.seq}</span>
                  </div>
                  <pre className="text-muted-foreground max-h-28 overflow-auto text-xs">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface RunCardProps {
  run: Run
}

function RunCard({ run }: RunCardProps) {
  const statusColors = {
    pending: "border-border bg-muted text-muted-foreground",
    waiting_approval: "border-amber-600 bg-amber-900 text-amber-300",
    running: "border-sky-600 bg-sky-900 text-sky-300",
    completed: "border-emerald-600 bg-emerald-900 text-emerald-300",
    failed: "border-rose-600 bg-rose-900 text-rose-300",
    cancelled: "border-border bg-muted text-muted-foreground",
  }

  return (
    <div className="glass rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge className={cn("border", statusColors[run.status])}>{run.status}</Badge>
            <span className="text-muted-foreground text-xs">{run.type}</span>
          </div>
          <p className="text-foreground mt-2 text-sm">{run.input}</p>
          {run.output && (
            <pre className="bg-background mt-2 max-h-32 overflow-auto rounded p-2 text-xs text-muted-foreground">
              {run.output}
            </pre>
          )}
          {run.error && <p className="mt-2 text-xs text-rose-400">{run.error}</p>}
        </div>
      </div>
      {run.duration !== undefined && (
        <p className="text-muted-foreground mt-2 text-xs">Duration: {run.duration}ms</p>
      )}
    </div>
  )
}
