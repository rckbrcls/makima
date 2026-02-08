import type {
  OpenClawWizardInputType,
  OpenClawWizardPrompt,
  OpenClawWizardState,
} from "@/lib/openclaw-types"

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function firstObject(
  source: Record<string, unknown>,
  keys: Array<string>,
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = source[key]
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }
  return undefined
}

function firstArray(
  source: Record<string, unknown>,
  keys: Array<string>,
): Array<unknown> {
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function coerceInputType(typeValue: unknown): OpenClawWizardInputType {
  const value = typeof typeValue === "string" ? typeValue.toLowerCase() : ""

  if (value.includes("password")) return "password"
  if (value.includes("number") || value.includes("int") || value.includes("float")) {
    return "number"
  }
  if (value.includes("bool") || value.includes("toggle") || value.includes("switch")) {
    return "boolean"
  }
  if (value.includes("multi") || value.includes("checkbox")) return "multiselect"
  if (value.includes("select") || value.includes("enum") || value.includes("choice")) {
    return "select"
  }

  return "text"
}

function normalizePrompts(raw: Record<string, unknown>): Array<OpenClawWizardPrompt> {
  const source = firstArray(raw, ["prompts", "questions", "fields"])

  return source
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => {
      const optionsRaw =
        (Array.isArray(item.options) ? item.options : null) ??
        (Array.isArray(item.choices) ? item.choices : null) ??
        []

      const options = optionsRaw
        .map((entry) => {
          if (typeof entry === "string") {
            return { label: entry, value: entry }
          }

          if (entry && typeof entry === "object") {
            const obj = entry as Record<string, unknown>
            const value =
              (obj.value as string | undefined) ??
              (obj.id as string | undefined) ??
              (obj.key as string | undefined)
            if (!value) return null
            return {
              label: (obj.label as string | undefined) ?? value,
              value,
            }
          }

          return null
        })
        .filter((entry): entry is { label: string; value: string } => !!entry)

      const id =
        (item.id as string | undefined) ??
        (item.key as string | undefined) ??
        (item.name as string | undefined) ??
        `prompt-${index + 1}`

      return {
        id,
        label:
          (item.label as string | undefined) ??
          (item.title as string | undefined) ??
          (item.question as string | undefined) ??
          id,
        description:
          (item.description as string | undefined) ??
          (item.help as string | undefined),
        type: coerceInputType(item.type ?? item.inputType ?? item.kind),
        required: (item.required as boolean | undefined) ?? false,
        options: options.length > 0 ? options : undefined,
        defaultValue: item.default,
      }
    })
}

export function normalizeWizardState(payload: unknown): OpenClawWizardState {
  const raw = asObject(payload)
  const completed =
    (raw.completed as boolean | undefined) ??
    (raw.complete as boolean | undefined) ??
    (raw.done as boolean | undefined) ??
    (raw.status as string | undefined) === "completed"

  const sessionId =
    (raw.sessionId as string | undefined) ??
    (raw.session_id as string | undefined) ??
    (raw.id as string | undefined)

  const step = firstObject(raw, ["step", "currentStep", "current_step"])
  const promptRoot = step ?? raw

  const stepId =
    (step?.id as string | undefined) ??
    (raw.stepId as string | undefined) ??
    (raw.step_id as string | undefined)

  return {
    sessionId,
    stepId,
    title:
      (step?.title as string | undefined) ??
      (raw.title as string | undefined) ??
      "OpenClaw Setup",
    description:
      (step?.description as string | undefined) ??
      (raw.description as string | undefined),
    prompts: normalizePrompts(promptRoot),
    completed,
    raw,
  }
}
