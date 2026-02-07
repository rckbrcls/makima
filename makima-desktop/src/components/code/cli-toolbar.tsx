import { Play, Plus, RotateCcw, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  useCliActiveSession,
  useCliSessionActions,
  useInstalledClis,
  useSelectedCliCommand,
} from "@/stores"
import { cn } from "@/lib/utils"

interface CliToolbarProps {
  repositoryName?: string
  onStart: () => void
  onStop: () => void
  onRestart: () => void
}

export function CliToolbar({
  repositoryName,
  onStart,
  onStop,
  onRestart,
}: CliToolbarProps) {
  const installedClis = useInstalledClis()
  const selectedCommand = useSelectedCliCommand()
  const activeSession = useCliActiveSession()
  const { setSelectedCliCommand } = useCliSessionActions()

  const isRunning = activeSession?.status === "running"
  const isExited = activeSession?.status === "exited"
  const hasError = activeSession?.status === "error"

  return (
    <div className="glass glass-solid flex items-center gap-3 rounded-xl px-4 py-2">
      {/* CLI Selector */}
      <select
        value={selectedCommand ?? ""}
        onChange={(e) => setSelectedCliCommand(e.target.value || null)}
        disabled={isRunning}
        className="bg-input text-foreground border-border h-7 rounded-md border px-2 text-xs focus:outline-none"
      >
        {installedClis.length === 0 && (
          <option value="">No CLIs detected</option>
        )}
        {installedClis.map((cli) => (
          <option key={cli.command} value={cli.command}>
            {cli.name}
            {cli.version ? ` (${cli.version})` : ""}
          </option>
        ))}
      </select>

      {/* Repository name */}
      {repositoryName && (
        <span className="text-muted-foreground truncate text-xs">
          {repositoryName}
        </span>
      )}

      {/* Session status badge */}
      {activeSession && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            isRunning && "border-emerald-500 bg-emerald-600 text-emerald-950",
            isExited && "border-secondary bg-secondary text-secondary-foreground",
            hasError && "border-destructive bg-destructive text-destructive-foreground",
          )}
        >
          {activeSession.status}
        </Badge>
      )}

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button
            variant="default"
            size="xs"
            onClick={onStart}
            disabled={!selectedCommand || !repositoryName}
          >
            <Play className="mr-1 size-3" />
            Start
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="xs"
              onClick={onStart}
              disabled={!selectedCommand || !repositoryName}
            >
              <Plus className="mr-1 size-3" />
              New
            </Button>
            <Button variant="outline" size="xs" onClick={onStop}>
              <Square className="mr-1 size-3" />
              Stop
            </Button>
            <Button variant="outline" size="xs" onClick={onRestart}>
              <RotateCcw className="mr-1 size-3" />
              Restart
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
