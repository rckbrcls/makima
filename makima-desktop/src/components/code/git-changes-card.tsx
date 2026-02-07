import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Columns2,
  File,
  FileEdit,
  FileMinus,
  FilePlus,
  GitBranch,
  RefreshCw,
  Rows2,
} from "lucide-react"
import type { DiffLine, FileDiff, GitFileChange } from "@/lib/code-types"
import { useGitStatus } from "@/hooks/use-git-status"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface GitChangesCardProps {
  repoPath?: string
  pollInterval?: number
  className?: string
}

function FileIcon({ status }: { status: GitFileChange["status"] }) {
  switch (status) {
    case "added":
      return <FilePlus className="size-4 text-emerald-400" />
    case "deleted":
      return <FileMinus className="size-4 text-red-400" />
    case "modified":
      return <FileEdit className="size-4 text-amber-400" />
    case "renamed":
      return <File className="size-4 text-blue-400" />
    default:
      return <File className="text-muted-foreground size-4" />
  }
}

function DiffViewer({ diff }: { diff: FileDiff }) {
  if (!diff.lines.length) {
    return (
      <div className="text-muted-foreground px-4 py-2 text-xs">
        No changes to display
      </div>
    )
  }

  return (
    <div className="overflow-x-auto font-mono text-xs">
      {diff.lines.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            "flex min-w-max px-2 py-0.5 whitespace-pre",
            line.kind === "add" && "bg-emerald-950 text-emerald-300",
            line.kind === "del" && "bg-red-950 text-red-300",
            line.kind === "hunk" && "bg-blue-950 text-blue-300",
            line.kind === "context" && "text-muted-foreground",
          )}
        >
          <span className="text-muted-foreground w-8 text-right select-none">
            {line.oldLineno ?? ""}
          </span>
          <span className="text-muted-foreground w-8 text-right select-none">
            {line.newLineno ?? ""}
          </span>
          <span className="ml-2 flex-1">{line.content}</span>
        </div>
      ))}
    </div>
  )
}

// --- Side-by-side diff ---

interface SideBySideRow {
  type: "hunk" | "pair"
  hunkContent?: string
  left?: DiffLine
  right?: DiffLine
}

function buildSideBySideRows(lines: Array<DiffLine>): Array<SideBySideRow> {
  const rows: Array<SideBySideRow> = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.kind === "hunk") {
      rows.push({ type: "hunk", hunkContent: line.content })
      i++
      continue
    }

    if (line.kind === "context") {
      rows.push({ type: "pair", left: line, right: line })
      i++
      continue
    }

    // Collect consecutive del then add blocks for pairing
    const dels: Array<DiffLine> = []
    const adds: Array<DiffLine> = []

    while (i < lines.length && lines[i].kind === "del") {
      dels.push(lines[i])
      i++
    }
    while (i < lines.length && lines[i].kind === "add") {
      adds.push(lines[i])
      i++
    }

    const maxLen = Math.max(dels.length, adds.length)
    for (let j = 0; j < maxLen; j++) {
      rows.push({
        type: "pair",
        left: j < dels.length ? dels[j] : undefined,
        right: j < adds.length ? adds[j] : undefined,
      })
    }
  }

  return rows
}

function SideBySideDiffViewer({ diff }: { diff: FileDiff }) {
  const rows = useMemo(() => buildSideBySideRows(diff.lines), [diff.lines])

  if (!diff.lines.length) {
    return (
      <div className="text-muted-foreground px-4 py-2 text-xs">
        No changes to display
      </div>
    )
  }

  return (
    <div className="overflow-x-auto font-mono text-xs">
      {rows.map((row, idx) => {
        if (row.type === "hunk") {
          return (
            <div
              key={idx}
              className="flex min-w-max bg-blue-950 px-2 py-0.5 text-blue-300 whitespace-pre"
            >
              <span className="flex-1">{row.hunkContent}</span>
            </div>
          )
        }

        return (
          <div key={idx} className="flex min-w-max">
            {/* Left side (old) */}
            <div
              className={cn(
                "flex w-1/2 border-r border-border px-2 py-0.5 whitespace-pre",
                row.left?.kind === "del" && "bg-red-950 text-red-300",
                row.left?.kind === "context" && "text-muted-foreground",
                !row.left && "bg-card",
              )}
            >
              <span className="text-muted-foreground w-8 text-right select-none">
                {row.left?.oldLineno ?? ""}
              </span>
              <span className="ml-2 flex-1">{row.left?.content ?? ""}</span>
            </div>

            {/* Right side (new) */}
            <div
              className={cn(
                "flex w-1/2 px-2 py-0.5 whitespace-pre",
                row.right?.kind === "add" && "bg-emerald-950 text-emerald-300",
                row.right?.kind === "context" && "text-muted-foreground",
                !row.right && "bg-card",
              )}
            >
              <span className="text-muted-foreground w-8 text-right select-none">
                {row.right?.newLineno ?? ""}
              </span>
              <span className="ml-2 flex-1">{row.right?.content ?? ""}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function GitChangesCard({ repoPath, pollInterval = 5000, className }: GitChangesCardProps) {
  const { status, isLoading, error, fetchStatus, fetchDiff } = useGitStatus({
    path: repoPath,
    pollInterval,
    autoStart: Boolean(repoPath),
  })

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["staged", "unstaged", "untracked"]),
  )
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null)
  const [isLoadingDiff, setIsLoadingDiff] = useState(false)
  const [diffView, setDiffView] = useState<"inline" | "split">("inline")

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  const handleFileClick = useCallback(
    async (filePath: string) => {
      if (selectedFile === filePath) {
        setSelectedFile(null)
        setSelectedDiff(null)
        return
      }

      setSelectedFile(filePath)
      setIsLoadingDiff(true)
      const diff = await fetchDiff(filePath)
      setSelectedDiff(diff)
      setIsLoadingDiff(false)
    },
    [selectedFile, fetchDiff],
  )

  const handleRefresh = useCallback(() => {
    fetchStatus()
  }, [fetchStatus])

  // Reset state when repoPath changes
  useEffect(() => {
    setSelectedFile(null)
    setSelectedDiff(null)
  }, [repoPath])

  if (!repoPath) {
    return (
      <div
        className={cn(
          "border-border bg-card flex flex-col items-center justify-center rounded-lg border p-8",
          className,
        )}
      >
        <GitBranch className="text-muted-foreground mb-2 size-8" />
        <p className="text-muted-foreground text-sm">
          Select a repository to view changes
        </p>
      </div>
    )
  }

  const totalChanges =
    (status?.staged.length ?? 0) +
    (status?.unstaged.length ?? 0) +
    (status?.untracked.length ?? 0)

  return (
    <div
      className={cn(
        "border-border bg-card flex flex-col overflow-hidden rounded-lg border",
        className,
      )}
    >
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <GitBranch className="text-muted-foreground size-4" />
          <span className="text-muted-foreground text-xs">
            {status?.branch ?? "Loading..."}
          </span>
          {totalChanges > 0 && (
            <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-medium text-amber-950">
              {totalChanges}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-border border-b bg-red-950 px-3 py-1 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* File tree and diff */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* File tree */}
        <div className="border-border w-64 flex-none overflow-y-auto border-r">
          {/* Staged */}
          {status?.staged && status.staged.length > 0 && (
            <div>
              <button
                className="glass-hover flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-400"
                onClick={() => toggleSection("staged")}
              >
                {expandedSections.has("staged") ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                Staged ({status.staged.length})
              </button>
              {expandedSections.has("staged") && (
                <div className="pb-1">
                  {status.staged.map((file) => (
                    <button
                      key={file.path}
                      className={cn(
                        "glass-hover flex w-full items-center gap-2 px-4 py-1 text-xs",
                        selectedFile === file.path && "glass-selected",
                      )}
                      onClick={() => handleFileClick(file.path)}
                    >
                      <FileIcon status={file.status} />
                      <span className="text-foreground truncate">
                        {file.path}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unstaged */}
          {status?.unstaged && status.unstaged.length > 0 && (
            <div>
              <button
                className="glass-hover flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-400"
                onClick={() => toggleSection("unstaged")}
              >
                {expandedSections.has("unstaged") ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                Changes ({status.unstaged.length})
              </button>
              {expandedSections.has("unstaged") && (
                <div className="pb-1">
                  {status.unstaged.map((file) => (
                    <button
                      key={file.path}
                      className={cn(
                        "glass-hover flex w-full items-center gap-2 px-4 py-1 text-xs",
                        selectedFile === file.path && "glass-selected",
                      )}
                      onClick={() => handleFileClick(file.path)}
                    >
                      <FileIcon status={file.status} />
                      <span className="text-foreground truncate">
                        {file.path}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Untracked */}
          {status?.untracked && status.untracked.length > 0 && (
            <div>
              <button
                className="glass-hover flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground"
                onClick={() => toggleSection("untracked")}
              >
                {expandedSections.has("untracked") ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                Untracked ({status.untracked.length})
              </button>
              {expandedSections.has("untracked") && (
                <div className="pb-1">
                  {status.untracked.map((filePath) => (
                    <button
                      key={filePath}
                      className={cn(
                        "glass-hover flex w-full items-center gap-2 px-4 py-1 text-xs",
                        selectedFile === filePath && "glass-selected",
                      )}
                      onClick={() => handleFileClick(filePath)}
                    >
                      <FilePlus className="text-muted-foreground size-4" />
                      <span className="text-muted-foreground truncate">{filePath}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {totalChanges === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <p className="text-muted-foreground text-xs">No changes detected</p>
            </div>
          )}
        </div>

        {/* Diff viewer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Diff toolbar */}
          {selectedDiff && !isLoadingDiff && (
            <div className="border-border flex items-center justify-between border-b px-3 py-1.5">
              <span className="text-muted-foreground truncate text-xs">
                {selectedDiff.path}
              </span>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("size-6", diffView === "inline" && "bg-muted")}
                      onClick={() => setDiffView("inline")}
                    >
                      <Rows2 className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Inline view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("size-6", diffView === "split" && "bg-muted")}
                      onClick={() => setDiffView("split")}
                    >
                      <Columns2 className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Side-by-side view</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Diff content */}
          <div className="bg-secondary flex-1 overflow-auto">
            {isLoadingDiff ? (
              <div className="flex h-full items-center justify-center">
                <RefreshCw className="text-muted-foreground size-4 animate-spin" />
              </div>
            ) : selectedDiff ? (
              diffView === "inline" ? (
                <DiffViewer diff={selectedDiff} />
              ) : (
                <SideBySideDiffViewer diff={selectedDiff} />
              )
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-xs">
                  Select a file to view changes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
