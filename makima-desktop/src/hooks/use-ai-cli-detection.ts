import { invoke } from "@tauri-apps/api/core"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { AiCliDetectionResult, AiCliInfo } from "@/lib/code-types"

export function useAiCliDetection() {
  const [clis, setClis] = useState<Array<AiCliInfo>>([])
  const [isDetecting, setIsDetecting] = useState(true)

  const detect = useCallback(async () => {
    setIsDetecting(true)
    try {
      const result = await invoke<AiCliDetectionResult>("detect_ai_clis")
      setClis(result.clis)
    } catch (err) {
      console.error("Failed to detect AI CLIs:", err)
    } finally {
      setIsDetecting(false)
    }
  }, [])

  useEffect(() => {
    detect()
  }, [detect])

  const installedClis = useMemo(
    () => clis.filter((cli) => cli.installed),
    [clis],
  )

  return { clis, installedClis, isDetecting, refresh: detect }
}
