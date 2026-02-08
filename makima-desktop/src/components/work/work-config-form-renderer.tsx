import { Fragment, useMemo } from "react"
import { ArrowDown, ArrowUp, CopyPlus, Plus, Trash2 } from "lucide-react"
import { WorkModelField } from "./work-model-field"
import type { ReactNode } from "react"
import type { ConfigPath } from "@/components/work/work-config-path-utils"
import type { OpenClawConfigSchemaNode } from "@/lib/openclaw-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  getAtPath,
  setAtPath,
  unsetAtPath,
} from "@/components/work/work-config-path-utils"
import {
  getModelOptions,
  getProviderOptions,
  getTopLevelSchemaProperties,
} from "@/components/work/work-config-schema-utils"
import { cn } from "@/lib/utils"

interface WorkConfigFormRendererProps {
  schema: OpenClawConfigSchemaNode
  value: Record<string, unknown>
  currentConfig: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  rootKeys?: Array<string>
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function toLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}

function isModelKey(path: ConfigPath): boolean {
  const key = path[path.length - 1]
  return typeof key === "string" && key.toLowerCase().includes("model")
}

function isProviderKey(path: ConfigPath): boolean {
  const key = path[path.length - 1]
  return typeof key === "string" && key.toLowerCase().includes("provider")
}

function getPrimaryType(node: OpenClawConfigSchemaNode | null): string {
  if (!node) return "string"
  const type = node.type
  if (typeof type === "string") return type
  if (Array.isArray(type) && type.length > 0) {
    const picked = type.find((entry) => entry !== "null")
    return picked ?? type[0]
  }
  if (node.properties) return "object"
  if (node.items) return "array"
  if (node.enum || node.oneOf || node.anyOf) return "string"
  return "string"
}

function inferSchemaFromValue(value: unknown): OpenClawConfigSchemaNode {
  if (Array.isArray(value)) {
    return {
      type: "array",
      items: value.length > 0 ? inferSchemaFromValue(value[0]) : { type: "string" },
    }
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      inferSchemaFromValue(nested),
    ])
    return {
      type: "object",
      properties: Object.fromEntries(entries),
    }
  }

  if (typeof value === "number") return { type: "number" }
  if (typeof value === "boolean") return { type: "boolean" }
  return { type: "string" }
}

function resolveUnionVariant(
  node: OpenClawConfigSchemaNode,
  currentValue: unknown,
): OpenClawConfigSchemaNode | null {
  const variants = [
    ...(Array.isArray(node.oneOf) ? node.oneOf : []),
    ...(Array.isArray(node.anyOf) ? node.anyOf : []),
  ]
  if (variants.length === 0) return null

  const currentType = Array.isArray(currentValue)
    ? "array"
    : currentValue === null
      ? "null"
      : typeof currentValue === "object"
        ? "object"
        : typeof currentValue

  const matched = variants.find((variant) => {
    const variantType = getPrimaryType(variant)
    if (variantType === currentType) return true

    if (Array.isArray(variant.enum) && typeof currentValue === "string") {
      return variant.enum.includes(currentValue)
    }

    if (typeof variant.const === "string" && typeof currentValue === "string") {
      return variant.const === currentValue
    }

    return false
  })

  return matched ?? variants[0]
}

function defaultForType(node: OpenClawConfigSchemaNode | null): unknown {
  if (!node) return ""
  if (node.default !== undefined) return node.default
  if (Array.isArray(node.enum) && node.enum.length > 0) return node.enum[0]

  const type = getPrimaryType(node)
  if (type === "object") return {}
  if (type === "array") return []
  if (type === "boolean") return false
  if (type === "number" || type === "integer") return 0
  return ""
}

function moveItem<T>(items: Array<T>, index: number, delta: number): Array<T> {
  const target = index + delta
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

function safeJson(value: unknown) {
  try {
    const serialized = JSON.stringify(value, null, 2)
    return typeof serialized === "string" ? serialized : "{}"
  } catch {
    return "{}"
  }
}

export function WorkConfigFormRenderer({
  schema,
  value,
  currentConfig,
  onChange,
  rootKeys,
}: WorkConfigFormRendererProps) {
  const schemaProperties = getTopLevelSchemaProperties(schema)
  const keys = useMemo(() => {
    if (rootKeys && rootKeys.length > 0) {
      return rootKeys
    }
    return Array.from(
      new Set([...Object.keys(schemaProperties), ...Object.keys(value)]),
    ).sort((a, b) => a.localeCompare(b))
  }, [rootKeys, schemaProperties, value])

  const providerOptions = useMemo(
    () => getProviderOptions(schema, currentConfig),
    [currentConfig, schema],
  )

  if (keys.length === 0) {
    return (
      <div className="rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Schema has no configurable properties.
      </div>
    )
  }

  const updateAtPath = (path: ConfigPath, nextValue: unknown) => {
    onChange(setAtPath(value, path, nextValue))
  }

  const removeAtPath = (path: ConfigPath) => {
    onChange(unsetAtPath(value, path))
  }

  const renderNode = (
    key: string,
    path: ConfigPath,
    descriptor: OpenClawConfigSchemaNode | null,
    currentValue: unknown,
    required: boolean,
    depth: number,
  ): ReactNode => {
    let node = descriptor ?? inferSchemaFromValue(currentValue)

    const unionVariant = resolveUnionVariant(node, currentValue)
    if (unionVariant) {
      node = {
        ...unionVariant,
        title: node.title ?? unionVariant.title,
        description: node.description ?? unionVariant.description,
      }
    }

    const type = getPrimaryType(node)
    const label = node.title ?? toLabel(key)
    const description = node.description

    const providerSibling = (() => {
      if (!isModelKey(path)) return undefined
      const parent = path.slice(0, -1)
      const providerValue = getAtPath(value, [...parent, "provider"])
      return typeof providerValue === "string" ? providerValue : undefined
    })()

    if (type === "object") {
      const properties = asObject(node.properties) ?? {}
      const requiredChildren = new Set(
        Array.isArray(node.required)
          ? node.required.filter((entry): entry is string => typeof entry === "string")
          : [],
      )
      const objectValue = asObject(currentValue) ?? {}
      const childKeys = Array.from(
        new Set([...Object.keys(properties), ...Object.keys(objectValue)]),
      ).sort((a, b) => a.localeCompare(b))

      if (childKeys.length === 0) {
        return (
          <div className="space-y-2">
            <Textarea
              value={safeJson(currentValue ?? {})}
              onChange={(e) => {
                try {
                  updateAtPath(path, JSON.parse(e.target.value))
                } catch {
                  // Keep current state while JSON is invalid.
                }
              }}
              className="min-h-24 font-mono text-xs"
            />
          </div>
        )
      }

      return (
        <div className={cn("space-y-2", depth > 0 && "rounded border border-border p-2")}>
          {childKeys.map((childKey) => (
            <Fragment key={`${path.join(".")}.${childKey}`}>
              {renderNode(
                childKey,
                [...path, childKey],
                (properties[childKey] as OpenClawConfigSchemaNode | null) ?? null,
                objectValue[childKey],
                requiredChildren.has(childKey),
                depth + 1,
              )}
            </Fragment>
          ))}
        </div>
      )
    }

    if (type === "array") {
      const items = Array.isArray(currentValue) ? currentValue : []
      const itemSchemaRaw = Array.isArray(node.items)
        ? node.items[0]
        : node.items
      const itemSchema = itemSchemaRaw ?? inferSchemaFromValue(items[0])

      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => {
                const next = [...items, defaultForType(itemSchema)]
                updateAtPath(path, next)
              }}
            >
              <Plus className="size-3" />
              Add item
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-muted-foreground text-xs">No items configured.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={`${path.join(".")}-${index}`} className="glass rounded p-2">
                  <div className="mb-2 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1"
                      onClick={() => updateAtPath(path, moveItem(items, index, -1))}
                      disabled={index === 0}
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1"
                      onClick={() => updateAtPath(path, moveItem(items, index, 1))}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1"
                      onClick={() => {
                        const duplicated = JSON.parse(safeJson(item ?? null)) as unknown
                        const next = [...items]
                        next.splice(index, 0, duplicated)
                        updateAtPath(path, next)
                      }}
                    >
                      <CopyPlus className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-rose-400"
                      onClick={() => removeAtPath([...path, index])}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  {renderNode(
                    `${label} item ${index + 1}`,
                    [...path, index],
                    itemSchema,
                    item,
                    false,
                    depth + 1,
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    const enumValues = Array.isArray(node.enum)
      ? node.enum.filter(
          (entry): entry is string | number | boolean =>
            typeof entry === "string" ||
            typeof entry === "number" ||
            typeof entry === "boolean",
        )
      : []

    const wrapper = (children: ReactNode) => (
      <div className="glass rounded-lg p-3">
        <label className="text-foreground mb-1 block text-xs font-medium">
          {label}
          {required ? " *" : ""}
        </label>
        {description && (
          <p className="text-muted-foreground mb-2 text-xs">{description}</p>
        )}
        {children}
      </div>
    )

    if (type === "boolean") {
      return wrapper(
        <div className="flex h-8 items-center">
          <Switch
            checked={Boolean(currentValue)}
            onCheckedChange={(checked) => updateAtPath(path, checked)}
          />
        </div>,
      )
    }

    if (isModelKey(path)) {
      return wrapper(
        <WorkModelField
          id={`model-${path.join("-")}`}
          value={typeof currentValue === "string" ? currentValue : ""}
          provider={providerSibling}
          options={getModelOptions(node, value)}
          onChange={(next) => updateAtPath(path, next)}
        />,
      )
    }

    if (isProviderKey(path)) {
      return wrapper(
        <>
          <Input
            value={typeof currentValue === "string" ? currentValue : ""}
            onChange={(e) => updateAtPath(path, e.target.value)}
            list={`provider-${path.join("-")}`}
            className="h-8 text-sm"
            placeholder="provider (custom allowed)"
          />
          <datalist id={`provider-${path.join("-")}`}>
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
        </>,
      )
    }

    if (enumValues.length > 0) {
      return wrapper(
        <select
          value={
            currentValue === undefined || currentValue === null
              ? ""
              : String(currentValue)
          }
          onChange={(e) => {
            const selected = e.target.value
            const parsed = enumValues.find((item) => String(item) === selected)
            updateAtPath(path, parsed ?? selected)
          }}
          className="bg-input h-8 w-full rounded border border-border px-2 text-sm"
        >
          <option value="">Select...</option>
          {enumValues.map((entry) => (
            <option key={String(entry)} value={String(entry)}>
              {String(entry)}
            </option>
          ))}
        </select>,
      )
    }

    if (type === "number" || type === "integer") {
      return wrapper(
        <Input
          type="number"
          value={typeof currentValue === "number" ? currentValue : ""}
          onChange={(e) =>
            updateAtPath(
              path,
              e.target.value === ""
                ? undefined
                : type === "integer"
                  ? Number.parseInt(e.target.value, 10)
                  : Number.parseFloat(e.target.value),
            )
          }
          className="h-8 text-sm"
        />,
      )
    }

    if (type === "string" && node.format !== "json") {
      return wrapper(
        <Input
          type={node.format === "password" ? "password" : "text"}
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(e) => updateAtPath(path, e.target.value)}
          className="h-8 text-sm"
        />,
      )
    }

    return wrapper(
      <Textarea
        value={safeJson(currentValue ?? defaultForType(node))}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value)
            updateAtPath(path, parsed)
          } catch {
            // Keep current state while JSON is invalid.
          }
        }}
        className="min-h-24 font-mono text-xs"
      />,
    )
  }

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const descriptor = schemaProperties[key] ?? null
        const required = Array.isArray(schema.required)
          ? schema.required.includes(key)
          : false
        const currentValue = value[key]

        return (
          <div key={key} className="space-y-2">
            {renderNode(key, [key], descriptor, currentValue, required, 0)}
          </div>
        )
      })}
    </div>
  )
}
