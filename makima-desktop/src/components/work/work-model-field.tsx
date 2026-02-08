import { useMemo, useState } from "react"
import type { OpenClawModelOption } from "@/lib/openclaw-types"
import { Input } from "@/components/ui/input"

interface WorkModelFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  provider?: string
  options: Array<OpenClawModelOption>
  placeholder?: string
}

function matchesProvider(modelValue: string, provider?: string): boolean {
  if (!provider) return true
  const normalizedProvider = provider.toLowerCase()
  const normalizedModel = modelValue.toLowerCase()
  return (
    normalizedModel.startsWith(`${normalizedProvider}/`) ||
    normalizedModel.startsWith(`${normalizedProvider}:`)
  )
}

export function WorkModelField({
  id,
  value,
  onChange,
  provider,
  options,
  placeholder = "provider/model (custom allowed)",
}: WorkModelFieldProps) {
  const [search, setSearch] = useState("")

  const filteredOptions = useMemo(() => {
    const filtered = options.filter((option) => {
      if (!matchesProvider(option.value, provider)) return false
      if (!search.trim()) return true
      const normalized = search.toLowerCase()
      return (
        option.label.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized)
      )
    })

    if (!value.trim()) return filtered
    if (filtered.some((option) => option.value === value)) return filtered
    return [{ value, label: value, provider }, ...filtered]
  }, [options, provider, search, value])

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => {
          const target = e.target as HTMLInputElement
          setSearch(target.value)
        }}
        list={id}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
      <datalist id={id}>
        {filteredOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label === option.value
              ? option.value
              : `${option.label} (${option.value})`}
          </option>
        ))}
      </datalist>
      <p className="text-muted-foreground text-[11px]">
        Suggestions from schema/config. You can also type a custom model.
      </p>
    </div>
  )
}
