import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CopyPlus,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Wrench,
} from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { WorkConfigFormRenderer } from "./work-config-form-renderer"
import { WorkModelField } from "./work-model-field"
import type { ConfigPath } from "@/components/work/work-config-path-utils"
import type { OpenClawAgentConfig, OpenClawConfigSchemaNode } from "@/lib/openclaw-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/sonner"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  getAtPath,
  setAtPath,
} from "@/components/work/work-config-path-utils"
import {
  buildConfigSections,
  getModelOptions,
  getProviderOptions,
  getTopLevelSchemaProperties,
  toConfigSchemaNode,
} from "@/components/work/work-config-schema-utils"
import { useOpenClawRpc } from "@/hooks/openclaw"
import { useWorkDomainActions } from "@/stores"

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asSchemaNode(value: unknown): OpenClawConfigSchemaNode | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as OpenClawConfigSchemaNode
  }
  return null
}

function safeJson(value: unknown) {
  try {
    const serialized = JSON.stringify(value, null, 2)
    return typeof serialized === "string" ? serialized : "{}"
  } catch {
    return "{}"
  }
}

function resolveAgentsPath(config: Record<string, unknown>): ConfigPath {
  const agents = config.agents
  if (Array.isArray(agents)) return ["agents"]

  const object = asObject(agents)
  if (object && Array.isArray(object.list)) return ["agents", "list"]

  return ["agents", "list"]
}

function readAgents(config: Record<string, unknown>): Array<Record<string, unknown>> {
  const list = getAtPath(config, resolveAgentsPath(config))
  if (!Array.isArray(list)) return []

  return list.map((item, index) => {
    const object = asObject(item)
    if (object) return object
    return { id: `agent-${index + 1}`, name: "", model: "" }
  })
}

function moveItem<T>(items: Array<T>, index: number, delta: number): Array<T> {
  const target = index + delta
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

function getChangedTopLevelKeys(
  currentConfig: Record<string, unknown>,
  draftConfig: Record<string, unknown>,
) {
  const keys = new Set([
    ...Object.keys(currentConfig),
    ...Object.keys(draftConfig),
  ])

  return [...keys]
    .filter(
      (key) =>
        JSON.stringify(currentConfig[key] ?? null) !==
        JSON.stringify(draftConfig[key] ?? null),
    )
    .sort((a, b) => a.localeCompare(b))
}

function findAgentFieldSchema(
  schema: OpenClawConfigSchemaNode,
  field: "model" | "provider",
): OpenClawConfigSchemaNode | null {
  const rootProps = asObject(schema.properties)
  const agentsNode = asSchemaNode(rootProps?.agents)
  if (!agentsNode) return null

  const agentsProps = asObject(agentsNode.properties)
  if (agentsProps) {
    const listNode = asSchemaNode(agentsProps.list)
    const listItems = asSchemaNode(listNode?.items)
    const listItemProps = asObject(listItems?.properties)
    const fromList = asSchemaNode(listItemProps?.[field])
    if (fromList) return fromList

    const fromDirect = asSchemaNode(agentsProps[field])
    if (fromDirect) return fromDirect
  }

  if (Array.isArray(agentsNode.items)) {
    const firstItem = asSchemaNode(agentsNode.items[0])
    const fieldNode = asSchemaNode(asObject(firstItem?.properties)?.[field])
    if (fieldNode) return fieldNode
  }

  const itemsNode = asSchemaNode(agentsNode.items)
  const itemProps = asObject(itemsNode?.properties)
  const nestedField = asSchemaNode(itemProps?.[field])
  if (nestedField) return nestedField

  return null
}

interface AgentsConfigEditorProps {
  schema: OpenClawConfigSchemaNode
  draftConfig: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

function AgentsConfigEditor({
  schema,
  draftConfig,
  onChange,
}: AgentsConfigEditorProps) {
  const agentsPath = resolveAgentsPath(draftConfig)
  const agents = readAgents(draftConfig)

  const modelSchema = useMemo(
    () => findAgentFieldSchema(schema, "model"),
    [schema],
  )
  const providerSchema = useMemo(
    () => findAgentFieldSchema(schema, "provider"),
    [schema],
  )

  const modelOptions = useMemo(
    () => getModelOptions(modelSchema, draftConfig),
    [draftConfig, modelSchema],
  )
  const providerOptions = useMemo(
    () => getProviderOptions(providerSchema, draftConfig),
    [draftConfig, providerSchema],
  )

  const updateAgents = (nextAgents: Array<Record<string, unknown>>) => {
    onChange(setAtPath(draftConfig, agentsPath, nextAgents))
  }

  const updateAgent = (
    index: number,
    key: string,
    fieldValue: string | boolean | undefined,
  ) => {
    const next = [...agents]
    const row = { ...next[index], [key]: fieldValue }
    next[index] = row
    updateAgents(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Agents</h4>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            const nextId = `agent-${agents.length + 1}`
            updateAgents([...agents, { id: nextId, name: nextId, model: "" }])
          }}
        >
          <Plus className="size-3" />
          Add Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No agents configured yet. Add one above.
        </p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent, index) => (
            <div key={`${agent.id ?? index}-${index}`} className="glass space-y-2 rounded-lg p-3">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1"
                  onClick={() => updateAgents(moveItem(agents, index, -1))}
                  disabled={index === 0}
                >
                  <ArrowUp className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1"
                  onClick={() => updateAgents(moveItem(agents, index, 1))}
                  disabled={index === agents.length - 1}
                >
                  <ArrowDown className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1"
                  onClick={() => {
                    const next = [...agents]
                    next.splice(index, 0, { ...agents[index] })
                    updateAgents(next)
                  }}
                >
                  <CopyPlus className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1 text-rose-400"
                  onClick={() => {
                    const next = [...agents]
                    next.splice(index, 1)
                    updateAgents(next)
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={typeof agent.id === "string" ? agent.id : ""}
                  onChange={(e) =>
                    updateAgent(
                      index,
                      "id",
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  placeholder="agent-id"
                  className="h-8 text-sm"
                />
                <Input
                  value={typeof agent.name === "string" ? agent.name : ""}
                  onChange={(e) => updateAgent(index, "name", e.target.value)}
                  placeholder="Agent name"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={typeof agent.provider === "string" ? agent.provider : ""}
                  onChange={(e) => updateAgent(index, "provider", e.target.value)}
                  list={`provider-agent-${index}`}
                  placeholder="provider (custom allowed)"
                  className="h-8 text-sm"
                />
                <datalist id={`provider-agent-${index}`}>
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
                <WorkModelField
                  id={`agent-model-${index}`}
                  value={typeof agent.model === "string" ? agent.model : ""}
                  provider={typeof agent.provider === "string" ? agent.provider : undefined}
                  options={modelOptions}
                  onChange={(nextModel) => updateAgent(index, "model", nextModel)}
                />
              </div>

              <div className="flex h-8 items-center gap-2">
                <Switch
                  checked={Boolean(agent.default)}
                  onCheckedChange={(checked) => updateAgent(index, "default", checked)}
                />
                <span className="text-muted-foreground text-xs">Default agent</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WorkConfigStudio() {
  const { getConfig, getConfigSchema, applyConfig, patchConfig, listTools, getHealth, getStatus } =
    useOpenClawRpc()
  const { setAgents, setError, setGatewayHealth, setToolsCatalog } = useWorkDomainActions()

  const [schema, setSchema] = useState<OpenClawConfigSchemaNode | null>(null)
  const [currentConfig, setCurrentConfig] = useState<Record<string, unknown>>({})
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({})
  const [patchText, setPatchText] = useState("{}")
  const [resultText, setResultText] = useState<string | null>(null)
  const [activeArea, setActiveArea] = useState("configuration")
  const [activeSection, setActiveSection] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const sections = useMemo(
    () => buildConfigSections(schema ?? { type: "object" }, draftConfig),
    [draftConfig, schema],
  )
  const schemaReady = !!schema && Object.keys(getTopLevelSchemaProperties(schema)).length > 0
  const changedTopLevelKeys = useMemo(
    () => getChangedTopLevelKeys(currentConfig, draftConfig),
    [currentConfig, draftConfig],
  )

  useEffect(() => {
    if (sections.length === 0) {
      setActiveSection("")
      return
    }

    if (!sections.some((section) => section.id === activeSection)) {
      setActiveSection(sections[0].id)
    }
  }, [activeSection, sections])

  const syncRuntimeState = useCallback(async () => {
    try {
      const agents = await invoke<Array<OpenClawAgentConfig>>("openclaw_list_agents")
      setAgents(
        agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          config: {
            model: agent.model,
            provider: agent.provider,
            tools: agent.tools,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })),
      )
      const [tools, health] = await Promise.all([listTools(), getHealth()])
      setToolsCatalog(tools)
      setGatewayHealth(health)
      await getStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [
    getHealth,
    getStatus,
    listTools,
    setAgents,
    setError,
    setGatewayHealth,
    setToolsCatalog,
  ])

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [schemaResponse, configResponse] = await Promise.all([
        getConfigSchema(),
        getConfig(),
      ])

      const schemaRaw =
        asObject(schemaResponse?.raw.schema) ??
        asObject(schemaResponse?.raw) ??
        null

      const nextConfig =
        asObject(configResponse?.config) ??
        asObject(configResponse) ??
        {}

      setSchema(schemaRaw ? toConfigSchemaNode(schemaRaw) : null)
      setCurrentConfig(nextConfig)
      setDraftConfig(nextConfig)
      setResultText(null)
    } finally {
      setIsLoading(false)
    }
  }, [getConfig, getConfigSchema])

  useEffect(() => {
    loadAll().catch(() => {
      // Best-effort load.
    })
  }, [loadAll])

  const handleApply = useCallback(async () => {
    setIsApplying(true)
    try {
      const result = await applyConfig(draftConfig)
      setResultText(JSON.stringify(result ?? { ok: false }, null, 2))

      if (result?.ok) {
        toast.success("OpenClaw config applied", {
          description: result.restarted
            ? "Gateway restarted with new settings."
            : "Configuration updated.",
        })
      } else {
        toast.error("Config apply returned warning", {
          description: "Check the result payload in Advanced tab.",
        })
      }

      await loadAll()
      await syncRuntimeState()
    } finally {
      setIsApplying(false)
    }
  }, [applyConfig, draftConfig, loadAll, syncRuntimeState])

  const handlePatch = useCallback(async () => {
    let parsedPatch: Record<string, unknown>
    try {
      const parsed = JSON.parse(patchText)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setResultText("Patch must be a JSON object")
        return
      }
      parsedPatch = parsed as Record<string, unknown>
    } catch {
      setResultText("Invalid patch JSON")
      return
    }

    setIsApplying(true)
    try {
      const result = await patchConfig(parsedPatch)
      setResultText(JSON.stringify(result ?? { ok: false }, null, 2))

      if (result?.ok) {
        toast.success("OpenClaw patch applied", {
          description: result.restarted
            ? "Gateway restarted with new settings."
            : "Patch applied successfully.",
        })
      } else {
        toast.error("Patch apply returned warning", {
          description: "Check patch payload and gateway response.",
        })
      }

      await loadAll()
      await syncRuntimeState()
    } finally {
      setIsApplying(false)
    }
  }, [loadAll, patchConfig, patchText, syncRuntimeState])

  const selectedSection = sections.find((section) => section.id === activeSection) || sections[0]

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Config Studio</h3>
          <p className="text-muted-foreground text-xs">
            UI-first OpenClaw configuration with advanced JSON fallback
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={loadAll}
            disabled={isLoading || isApplying}
          >
            {isLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Reload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Save className="size-3" />
            )}
            Apply Config
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {changedTopLevelKeys.length === 0 ? (
          <span className="text-muted-foreground">No pending top-level changes.</span>
        ) : (
          <>
            <CheckCircle2 className="size-3 text-emerald-500" />
            <span className="text-muted-foreground">
              Pending changes: {changedTopLevelKeys.join(", ")}
            </span>
          </>
        )}
      </div>

      <Tabs
        value={activeArea}
        onValueChange={setActiveArea}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList>
          <TabsTrigger value="configuration">Configuracao</TabsTrigger>
          <TabsTrigger value="advanced">Avancado (JSON)</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="min-h-0 flex-1 overflow-hidden">
          {!schemaReady && (
            <div className="mb-3 rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Config schema not available from gateway. Use the Advanced tab to edit JSON
              directly.
            </div>
          )}

          {sections.length === 0 ? (
            <div className="rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              No configuration sections detected.
            </div>
          ) : (
            <Tabs
              value={selectedSection.id}
              onValueChange={setActiveSection}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList variant="line" className="w-full flex-wrap justify-start">
                {sections.map((section) => (
                  <TabsTrigger key={section.id} value={section.id} className="px-2">
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {sections.map((section) => {
                const rendererKeys =
                  section.id === "agents"
                    ? section.keys.filter((key) => key !== "agents")
                    : section.keys

                return (
                  <TabsContent
                    key={section.id}
                    value={section.id}
                    className="min-h-0 flex-1 overflow-y-auto pr-1"
                  >
                    <div className="space-y-3">
                      {section.id === "agents" && schema && (
                        <AgentsConfigEditor
                          schema={schema}
                          draftConfig={draftConfig}
                          onChange={setDraftConfig}
                        />
                      )}

                      {rendererKeys.length > 0 && (
                        <WorkConfigFormRenderer
                          schema={schema ?? { type: "object" }}
                          currentConfig={currentConfig}
                          value={draftConfig}
                          onChange={setDraftConfig}
                          rootKeys={rendererKeys}
                        />
                      )}
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-h-0 gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <h4 className="mb-1 text-sm font-medium">Current Config (read)</h4>
                <Textarea
                  value={safeJson(currentConfig)}
                  readOnly
                  className="min-h-48 font-mono text-xs"
                />
              </div>

              <div>
                <h4 className="mb-1 text-sm font-medium">Draft Config (UI state)</h4>
                <Textarea
                  value={safeJson(draftConfig)}
                  readOnly
                  className="min-h-48 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="mb-1 text-sm font-medium">Patch JSON</h4>
                <Textarea
                  value={patchText}
                  onChange={(e) => setPatchText(e.target.value)}
                  className="min-h-48 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handlePatch}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Wrench className="size-3" />
                  )}
                  Apply Patch
                </Button>
              </div>

              {resultText && (
                <div>
                  <h4 className="mb-1 text-sm font-medium">Result</h4>
                  <pre className="bg-background max-h-56 overflow-auto rounded p-2 text-xs text-muted-foreground">
                    {resultText}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
