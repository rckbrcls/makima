import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
import type { FileDiff, GitFileChange } from "@/lib/code-types"
import type { IntralineSpan, RowModel } from "@/lib/diff-engine"
import { buildRowModels } from "@/lib/diff-engine"
import { ScrollSyncController } from "@/lib/scroll-sync"
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
      {diff.lines.map((line, idx) => {
        if (line.kind === "hunk") {
          return (
            <div
              key={idx}
              className="bg-accent leading-6 border-y border-accent"
            >
              <span className="text-muted-foreground w-12 inline-block shrink-0 select-none px-2 text-right" />
              <span className="text-muted-foreground w-12 inline-block shrink-0 select-none px-2 text-right" />
            </div>
          )
        }

        return (
          <div
            key={idx}
            className={cn(
              "flex min-w-max whitespace-pre leading-6",
              line.kind === "add" && "bg-diff-add-bg text-diff-add-fg",
              line.kind === "del" && "bg-diff-del-bg text-diff-del-fg",
              line.kind === "context" && "text-muted-foreground",
            )}
          >
            <span className="text-muted-foreground w-12 shrink-0 select-none px-2 text-right">
              {line.oldLineno ?? ""}
            </span>
            <span className="text-muted-foreground w-12 shrink-0 select-none px-2 text-right">
              {line.newLineno ?? ""}
            </span>
            <span className="border-border shrink-0 border-r" />
            <span className="px-3 flex-1">{line.content}</span>
          </div>
        )
      })}
    </div>
  )
}

// --- Side-by-side diff ---

const ROW_HEIGHT = 24
const OVERSCAN = 20

function renderLineContent(
  text: string,
  spans: Array<IntralineSpan>,
  cssClass: string,
) {
  if (!spans.length) return text

  const parts: Array<React.ReactNode> = []
  let cursor = 0

  for (let i = 0; i < spans.length; i++) {
    const { start, length } = spans[i]
    if (start > cursor) {
      parts.push(text.slice(cursor, start))
    }
    parts.push(
      <mark key={i} className={cn("rounded-sm", cssClass)}>
        {text.slice(start, start + length)}
      </mark>,
    )
    cursor = start + length
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return <>{parts}</>
}

interface DiffRowSideProps {
  side: RowModel["left"]
  inlineClass: string
}

const DiffRowSide = React.memo(function DiffRowSide({
  side,
  inlineClass,
}: DiffRowSideProps) {
  return (
    <div
      className={cn(
        "flex min-w-max whitespace-pre leading-6",
        side.kind === "placeholder" && "diff-filler-hatched",
        side.kind === "del" && "bg-diff-del-bg text-diff-del-fg",
        side.kind === "add" && "bg-diff-add-bg text-diff-add-fg",
        side.kind === "context" && "text-muted-foreground",
      )}
    >
      <span className="text-muted-foreground w-12 shrink-0 select-none px-2 text-right">
        {side.kind === "placeholder"
          ? "\u2014"
          : (side.lineNumber ?? "")}
      </span>
      <span className="border-border shrink-0 border-r" />
      <span className="px-3">
        {side.spans.length > 0
          ? renderLineContent(side.content, side.spans, inlineClass)
          : side.content}
      </span>
    </div>
  )
})

function SideBySideDiffViewer({ diff }: { diff: FileDiff }) {
  const rows = useMemo(() => buildRowModels(diff.lines), [diff.lines])
  const [split, setSplit] = useState(50)
  const [range, setRange] = useState({ start: 0, end: 50 })

  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const vRaf = useRef(0)
  const syncRef = useRef<ScrollSyncController | null>(null)

  // Attach scroll sync controller
  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    if (!left || !right) return

    const ctrl = new ScrollSyncController()
    ctrl.attach(left, right)
    syncRef.current = ctrl

    return () => {
      ctrl.dispose()
      syncRef.current = null
    }
  }, [])

  // Cleanup vRaf on unmount
  useEffect(() => {
    return () => {
      if (vRaf.current) cancelAnimationFrame(vRaf.current)
    }
  }, [])

  // Initialize visible range on mount / diff change
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const end = Math.min(
      rows.length,
      Math.ceil(el.clientHeight / ROW_HEIGHT) + OVERSCAN,
    )
    setRange({ start: 0, end })
  }, [rows.length])

  // Restore horizontal scroll after visible range changes
  useLayoutEffect(() => {
    if (syncRef.current) {
      syncRef.current.restoreScrollLeft(syncRef.current.getScrollLeft())
    }
  }, [range])

  // Resize handle
  const handleResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const onMove = (ev: MouseEvent) => {
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplit(Math.max(25, Math.min(75, pct)))
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [])

  // Vertical scroll -> update visible range, rAF batched
  const handleVScroll = useCallback(() => {
    if (!vRaf.current) {
      vRaf.current = requestAnimationFrame(() => {
        vRaf.current = 0
        const el = scrollRef.current
        if (!el) return
        const start = Math.max(
          0,
          Math.floor(el.scrollTop / ROW_HEIGHT) - OVERSCAN,
        )
        const end = Math.min(
          rows.length,
          Math.ceil((el.scrollTop + el.clientHeight) / ROW_HEIGHT) + OVERSCAN,
        )
        setRange((prev) =>
          prev.start === start && prev.end === end
            ? prev
            : { start, end },
        )
      })
    }
  }, [rows.length])

  if (!diff.lines.length) {
    return (
      <div className="text-muted-foreground px-4 py-2 text-xs">
        No changes to display
      </div>
    )
  }

  const totalHeight = rows.length * ROW_HEIGHT
  const visibleRows = rows.slice(range.start, range.end)
  const offsetY = range.start * ROW_HEIGHT

  return (
    <div ref={wrapperRef} className="relative h-full font-mono text-xs">
      {/* Drag handle */}
      <div
        className="absolute top-0 bottom-0 z-10 w-1 cursor-col-resize hover:bg-ring active:bg-ring"
        style={{ left: `${split}%`, transform: "translateX(-50%)" }}
        onMouseDown={handleResize}
      />

      {/* Vertical scroll container */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
        onScroll={handleVScroll}
      >
        <div className="relative" style={{ height: totalHeight }}>
          <div
            className="absolute left-0 right-0 flex"
            style={{ top: offsetY }}
          >
            {/* Left column */}
            <div
              ref={leftRef}
              className="shrink-0 overflow-x-auto overflow-y-hidden"
              style={{
                width: `${split}%`,
                contain: "layout style",
              }}
            >
              <div className="w-max min-w-full">
                {visibleRows.map((row, i) =>
                  row.isSeparator ? (
                    <div
                      key={range.start + i}
                      className="bg-accent flex h-6 items-center border-y border-accent px-2"
                    >
                      <span className="text-muted-foreground truncate text-[10px]">
                        {row.hunkHeader}
                      </span>
                    </div>
                  ) : (
                    <DiffRowSide
                      key={range.start + i}
                      side={row.left}
                      inlineClass="bg-diff-del-inline-bg"
                    />
                  ),
                )}
              </div>
            </div>

            {/* Right column */}
            <div
              ref={rightRef}
              className="border-border min-w-0 flex-1 overflow-x-auto overflow-y-hidden border-l"
              style={{ contain: "layout style" }}
            >
              <div className="w-max min-w-full">
                {visibleRows.map((row, i) =>
                  row.isSeparator ? (
                    <div
                      key={range.start + i}
                      className="bg-accent flex h-6 items-center border-y border-accent px-2"
                    >
                      <span className="text-muted-foreground truncate text-[10px]">
                        {row.hunkHeader}
                      </span>
                    </div>
                  ) : (
                    <DiffRowSide
                      key={range.start + i}
                      side={row.right}
                      inlineClass="bg-diff-add-inline-bg"
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
    async (filePath: string, staged?: boolean) => {
      if (selectedFile === filePath) {
        setSelectedFile(null)
        setSelectedDiff(null)
        return
      }

      setSelectedFile(filePath)
      setIsLoadingDiff(true)
      const diff = await fetchDiff(filePath, { staged })
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
                      onClick={() => handleFileClick(file.path, true)}
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
          <div
            className={cn(
              "bg-secondary min-h-0 flex-1",
              diffView === "split" && selectedDiff && !isLoadingDiff
                ? "overflow-hidden"
                : "overflow-auto",
            )}
          >
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
