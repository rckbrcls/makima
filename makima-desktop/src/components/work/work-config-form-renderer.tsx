import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface WorkConfigFormRendererProps {
  schema: Record<string, unknown>
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
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

export function WorkConfigFormRenderer({
  schema,
  value,
  onChange,
}: WorkConfigFormRendererProps) {
  const properties = asObject(schema.properties)

  if (!properties || Object.keys(properties).length === 0) {
    return (
      <div className="rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Schema has no top-level properties. Use JSON patch/apply below.
      </div>
    )
  }

  const updateField = (key: string, nextValue: unknown) => {
    onChange({
      ...value,
      [key]: nextValue,
    })
  }

  return (
    <div className="space-y-3">
      {Object.entries(properties).map(([key, descriptor]) => {
        const config = asObject(descriptor) ?? {}
        const type = config.type as string | undefined
        const format = config.format as string | undefined
        const description = config.description as string | undefined
        const enumValues = Array.isArray(config.enum)
          ? config.enum.filter((entry): entry is string => typeof entry === "string")
          : []

        const fieldValue = value[key]

        return (
          <div key={key} className="glass rounded-lg p-3">
            <label className="text-foreground mb-1 block text-xs font-medium">
              {toLabel(key)}
            </label>
            {description && (
              <p className="text-muted-foreground mb-2 text-xs">{description}</p>
            )}

            {type === "boolean" ? (
              <div className="flex h-8 items-center">
                <Switch
                  checked={Boolean(fieldValue)}
                  onCheckedChange={(checked) => updateField(key, checked)}
                />
              </div>
            ) : enumValues.length > 0 ? (
              <select
                value={typeof fieldValue === "string" ? fieldValue : ""}
                onChange={(e) => updateField(key, e.target.value)}
                className="bg-input h-8 w-full rounded border border-border px-2 text-sm"
              >
                <option value="">Select...</option>
                {enumValues.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            ) : type === "number" || type === "integer" ? (
              <Input
                type="number"
                value={typeof fieldValue === "number" ? fieldValue : ""}
                onChange={(e) =>
                  updateField(
                    key,
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                className="h-8 text-sm"
              />
            ) : type === "string" && format !== "json" ? (
              <Input
                type={format === "password" ? "password" : "text"}
                value={typeof fieldValue === "string" ? fieldValue : ""}
                onChange={(e) => updateField(key, e.target.value)}
                className="h-8 text-sm"
              />
            ) : (
              <Textarea
                value={JSON.stringify(fieldValue ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    updateField(key, parsed)
                  } catch {
                    // Keep current state until valid JSON.
                  }
                }}
                className="min-h-24 font-mono text-xs"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
