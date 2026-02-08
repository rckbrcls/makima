import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Save, Wrench } from "lucide-react"
import { WorkConfigFormRenderer } from "./work-config-form-renderer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useOpenClawRpc } from "@/hooks/openclaw"

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

export function WorkConfigStudio() {
  const { getConfig, getConfigSchema, applyConfig, patchConfig } = useOpenClawRpc()

  const [schema, setSchema] = useState<Record<string, unknown> | null>(null)
  const [currentConfig, setCurrentConfig] = useState<Record<string, unknown>>({})
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({})
  const [patchText, setPatchText] = useState("{}")
  const [resultText, setResultText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  const schemaReady = useMemo(
    () => !!schema && Object.keys(schema).length > 0,
    [schema],
  )

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [schemaResponse, configResponse] = await Promise.all([
        getConfigSchema(),
        getConfig(),
      ])

      const nextSchema =
        asObject(schemaResponse?.raw.schema) ??
        asObject(schemaResponse?.raw) ??
        null

      const nextConfig =
        asObject(configResponse?.config) ??
        asObject(configResponse) ??
        {}

      setSchema(nextSchema)
      setCurrentConfig(nextConfig)
      setDraftConfig(nextConfig)
      setResultText(null)
    } finally {
      setIsLoading(false)
    }
  }, [getConfig, getConfigSchema])

  useEffect(() => {
    loadAll().catch(() => {
      // Best effort load.
    })
  }, [loadAll])

  const handleApply = useCallback(async () => {
    setIsApplying(true)
    try {
      const result = await applyConfig(draftConfig)
      setResultText(JSON.stringify(result ?? { ok: false }, null, 2))
      await loadAll()
    } finally {
      setIsApplying(false)
    }
  }, [applyConfig, draftConfig, loadAll])

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
      await loadAll()
    } finally {
      setIsApplying(false)
    }
  }, [loadAll, patchConfig, patchText])

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-hidden p-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Config Studio</h3>
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
        </div>

        {schemaReady && schema ? (
          <WorkConfigFormRenderer
            schema={schema}
            value={draftConfig}
            onChange={setDraftConfig}
          />
        ) : (
          <div className="rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Config schema not available from gateway. Editing full JSON only.
          </div>
        )}

        <div className="flex justify-end">
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

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
        <div>
          <h4 className="mb-1 text-sm font-medium">Current Config (read)</h4>
          <Textarea
            value={JSON.stringify(currentConfig, null, 2)}
            readOnly
            className="min-h-40 font-mono text-xs"
          />
        </div>

        <div>
          <h4 className="mb-1 text-sm font-medium">Patch Preview (JSON)</h4>
          <Textarea
            value={patchText}
            onChange={(e) => setPatchText(e.target.value)}
            className="min-h-32 font-mono text-xs"
          />
          <div className="mt-2 flex justify-end">
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
        </div>

        {resultText && (
          <div>
            <h4 className="mb-1 text-sm font-medium">Result</h4>
            <pre className="bg-background max-h-44 overflow-auto rounded p-2 text-xs text-muted-foreground">
              {resultText}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
