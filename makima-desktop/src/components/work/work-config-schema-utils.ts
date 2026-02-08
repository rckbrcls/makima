import type {
  OpenClawConfigSchemaNode,
  OpenClawConfigSection,
  OpenClawModelOption,
  OpenClawProviderOption,
} from "@/lib/openclaw-types"

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asSchemaNode(value: unknown): OpenClawConfigSchemaNode | null {
  return asObject(value) as OpenClawConfigSchemaNode | null
}

function collectStringValues(items: Array<unknown>): Array<string> {
  const unique = new Set<string>()
  for (const item of items) {
    if (typeof item === "string" && item.trim()) unique.add(item.trim())
  }
  return [...unique]
}

function parseProviderFromModel(model: string): string | undefined {
  const slash = model.indexOf("/")
  if (slash > 0) return model.slice(0, slash)

  const colon = model.indexOf(":")
  if (colon > 0) return model.slice(0, colon)

  return undefined
}

function normalizeModelOption(value: string): OpenClawModelOption {
  return {
    value,
    label: value,
    provider: parseProviderFromModel(value),
  }
}

function normalizeProviderOption(value: string): OpenClawProviderOption {
  return {
    value,
    label: value,
  }
}

const SECTION_LABELS: Record<string, string> = {
  agents: "Agents",
  providers_models: "Providers/Models",
  gateway_auth: "Gateway/Auth",
  tools_safety: "Tools/Safety",
  session_history: "Session/History",
  other: "Other",
}

function classifyKey(key: string): keyof typeof SECTION_LABELS {
  const normalized = key.toLowerCase()
  if (normalized.includes("agent")) return "agents"
  if (
    normalized.includes("model") ||
    normalized.includes("provider") ||
    normalized.includes("llm")
  ) {
    return "providers_models"
  }
  if (
    normalized.includes("gateway") ||
    normalized.includes("auth") ||
    normalized.includes("token") ||
    normalized.includes("password")
  ) {
    return "gateway_auth"
  }
  if (
    normalized.includes("tool") ||
    normalized.includes("safety") ||
    normalized.includes("policy") ||
    normalized.includes("approval")
  ) {
    return "tools_safety"
  }
  if (
    normalized.includes("session") ||
    normalized.includes("history") ||
    normalized.includes("run")
  ) {
    return "session_history"
  }
  return "other"
}

export function toConfigSchemaNode(rawSchema: Record<string, unknown>): OpenClawConfigSchemaNode {
  const root =
    (asObject(rawSchema.schema) as OpenClawConfigSchemaNode | null) ??
    (rawSchema as OpenClawConfigSchemaNode)
  return root
}

export function getTopLevelSchemaProperties(
  schema: OpenClawConfigSchemaNode,
): Partial<Record<string, OpenClawConfigSchemaNode>> {
  const properties = asObject(schema.properties)
  const entries = Object.entries(properties ?? {}).filter(([, value]) => !!asSchemaNode(value))
  return Object.fromEntries(entries) as Partial<Record<string, OpenClawConfigSchemaNode>>
}

export function buildConfigSections(
  schema: OpenClawConfigSchemaNode,
  currentConfig: Record<string, unknown>,
): Array<OpenClawConfigSection> {
  const keys = new Set<string>([
    ...Object.keys(getTopLevelSchemaProperties(schema)),
    ...Object.keys(currentConfig),
  ])

  const grouped = new Map<string, Array<string>>()
  for (const key of keys) {
    const section = classifyKey(key)
    const current = grouped.get(section) ?? []
    current.push(key)
    grouped.set(section, current)
  }

  const ordered = [
    "agents",
    "providers_models",
    "gateway_auth",
    "tools_safety",
    "session_history",
    "other",
  ] as const

  const sections: Array<OpenClawConfigSection> = []
  for (const id of ordered) {
    const sectionKeys = grouped.get(id) ?? []
    if (sectionKeys.length === 0) continue

    sections.push({
      id,
      title: SECTION_LABELS[id],
      keys: [...sectionKeys].sort((a, b) => a.localeCompare(b)),
    })
  }

  return sections
}

function extractStringEnums(node: OpenClawConfigSchemaNode | null): Array<string> {
  if (!node) return []

  const values: Array<string> = []
  if (Array.isArray(node.enum)) {
    values.push(...collectStringValues(node.enum))
  }

  const variants = [
    ...(Array.isArray(node.oneOf) ? node.oneOf : []),
    ...(Array.isArray(node.anyOf) ? node.anyOf : []),
  ]
  for (const variant of variants) {
    const constValue = variant.const
    if (typeof constValue === "string") values.push(constValue)
    if (Array.isArray(variant.enum)) values.push(...collectStringValues(variant.enum))
  }

  return collectStringValues(values)
}

export function collectModelValuesFromConfig(config: unknown): Array<string> {
  const found = new Set<string>()

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }

    const obj = asObject(value)
    if (!obj) return

    for (const [key, nested] of Object.entries(obj)) {
      if (typeof nested === "string" && key.toLowerCase().includes("model")) {
        const trimmed = nested.trim()
        if (trimmed) found.add(trimmed)
      }
      visit(nested)
    }
  }

  visit(config)
  return [...found].sort((a, b) => a.localeCompare(b))
}

export function collectProviderValuesFromConfig(config: unknown): Array<string> {
  const found = new Set<string>()

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)
      return
    }

    const obj = asObject(value)
    if (!obj) return

    for (const [key, nested] of Object.entries(obj)) {
      if (typeof nested === "string" && key.toLowerCase().includes("provider")) {
        const trimmed = nested.trim()
        if (trimmed) found.add(trimmed)
      }
      visit(nested)
    }
  }

  visit(config)
  return [...found].sort((a, b) => a.localeCompare(b))
}

export function getModelOptions(
  schemaNode: OpenClawConfigSchemaNode | null,
  currentConfig: Record<string, unknown>,
): Array<OpenClawModelOption> {
  const fromSchema = extractStringEnums(schemaNode).map(normalizeModelOption)
  const fromConfig = collectModelValuesFromConfig(currentConfig).map(normalizeModelOption)
  const dedupe = new Map<string, OpenClawModelOption>()

  for (const option of [...fromSchema, ...fromConfig]) {
    dedupe.set(option.value, option)
  }

  return [...dedupe.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export function getProviderOptions(
  schemaNode: OpenClawConfigSchemaNode | null,
  currentConfig: Record<string, unknown>,
): Array<OpenClawProviderOption> {
  const fromSchema = extractStringEnums(schemaNode).map(normalizeProviderOption)
  const fromConfig = collectProviderValuesFromConfig(currentConfig).map(normalizeProviderOption)
  const fromModels = collectModelValuesFromConfig(currentConfig)
    .map(parseProviderFromModel)
    .filter((value): value is string => !!value)
    .map(normalizeProviderOption)

  const dedupe = new Map<string, OpenClawProviderOption>()
  for (const option of [...fromSchema, ...fromConfig, ...fromModels]) {
    dedupe.set(option.value, option)
  }

  return [...dedupe.values()].sort((a, b) => a.label.localeCompare(b.label))
}
