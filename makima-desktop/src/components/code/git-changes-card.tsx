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
  ChevronUp,
  Columns2,
  File,
  FileEdit,
  FileMinus,
  FilePlus,
  FolderIcon,
  FolderOpenIcon,
  GitBranch,
  List,
  RefreshCw,
  Rows2,
  ListTree,
} from "lucide-react"
import type { FileDiff, GitFileChange, GitStatus } from "@/lib/code-types"
import type { IntralineSpan, RowModel } from "@/lib/diff-engine"
import { buildRowModels } from "@/lib/diff-engine"
import { ScrollSyncController } from "@/lib/scroll-sync"
import { useGitStatus } from "@/hooks/use-git-status"
import {
  useFileListView,
  useDiffView,
  useExpandedSections,
  useSplitPosition,
  useCodeLayoutActions,
} from "@/stores"
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
      return <FilePlus className="size-4 text-diff-add-fg" />
    case "deleted":
      return <FileMinus className="size-4 text-diff-del-fg" />
    case "modified":
      return <FileEdit className="size-4 text-foreground" />
    case "renamed":
      return <File className="size-4 text-ring" />
    default:
      return <File className="size-4 text-muted-foreground" />
  }
}

// --- File tree helpers ---

interface FileTreeNode {
  name: string
  fullPath: string
  isFile: boolean
  status?: GitFileChange["status"]
  staged?: boolean
  children: Map<string, FileTreeNode>
}

function buildFileTree(
  files: Array<{ path: string; status?: GitFileChange["status"]; staged?: boolean }>,
): FileTreeNode {
  const root: FileTreeNode = {
    name: "",
    fullPath: "",
    isFile: false,
    children: new Map(),
  }

  for (const file of files) {
    const parts = file.path.split("/")
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: parts.slice(0, i + 1).join("/"),
          isFile: isLast,
          status: isLast ? file.status : undefined,
          staged: isLast ? file.staged : undefined,
          children: new Map(),
        })
      }

      current = current.children.get(part)!
    }
  }

  return root
}

function FileTreeView({
  node,
  selectedFile,
  onFileClick,
  depth = 0,
}: {
  node: FileTreeNode
  selectedFile: string | null
  onFileClick: (path: string, staged?: boolean) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const sortedChildren = useMemo(() => {
    const entries = Array.from(node.children.values())
    // folders first, then files, alphabetical within each group
    return entries.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [node.children])

  return (
    <>
      {sortedChildren.map((child) =>
        child.isFile ? (
          <button
            key={child.fullPath}
            className={cn(
              "bg-background border-border border flex w-full items-center gap-2 py-1 text-xs",
              selectedFile === child.fullPath && "glass-selected",
            )}
            style={{ paddingLeft: depth * 12 + 16 }}
            onClick={() => onFileClick(child.fullPath, child.staged)}
          >
            <FileIcon status={child.status ?? "modified"} />
            <span className="text-foreground truncate">{child.name}</span>
          </button>
        ) : (
          <div key={child.fullPath}>
            <button
              className="glass-hover flex w-full items-center gap-1 py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: depth * 12 + 8 }}
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <FolderOpenIcon className="size-3.5" />
              ) : (
                <FolderIcon className="size-3.5" />
              )}
              <span className="truncate">{child.name}</span>
            </button>
            {expanded && (
              <FileTreeView
                node={child}
                selectedFile={selectedFile}
                onFileClick={onFileClick}
                depth={depth + 1}
              />
            )}
          </div>
        ),
      )}
    </>
  )
}

function DiffViewer({
  diff,
  scrollRequestId,
  targetChangeIndex,
}: {
  diff: FileDiff
  scrollRequestId?: number
  targetChangeIndex?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (targetChangeIndex == null || targetChangeIndex < 0) return
    const el = containerRef.current?.querySelector(
      `[data-change-index="${targetChangeIndex}"]`,
    )
    el?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [scrollRequestId, targetChangeIndex])

  if (!diff.lines.length) {
    return (
      <div className="text-muted-foreground px-4 py-2 text-xs">
        No changes to display
      </div>
    )
  }

  let changeCounter = -1
  let inChange = false

  return (
    <div ref={containerRef} className="overflow-x-auto font-mono text-xs">
      {diff.lines.map((line, idx) => {
        const isChange = line.kind === "add" || line.kind === "del"
        let changeIndex: number | undefined
        if (isChange && !inChange) {
          changeCounter++
          changeIndex = changeCounter
        }
        inChange = isChange

        if (line.kind === "hunk") {
          inChange = false
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
            data-change-index={changeIndex}
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

function SideBySideDiffViewer({
  diff,
  scrollRequestId,
  targetChangeIndex,
}: {
  diff: FileDiff
  scrollRequestId?: number
  targetChangeIndex?: number
}) {
  const rows = useMemo(() => buildRowModels(diff.lines), [diff.lines])

  const changeRowIndices = useMemo(() => {
    const positions: Array<number> = []
    let inChange = false
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const isChange = !row.isSeparator && !row.isContext
      if (isChange && !inChange) positions.push(i)
      inChange = isChange
    }
    return positions
  }, [rows])

  // Split position: local state for instant drag feedback, synced from/to store
  const savedSplitPosition = useSplitPosition()
  const { setSplitPosition: persistSplitPosition } = useCodeLayoutActions()
  const [split, setSplit] = useState(savedSplitPosition)
  const splitRef = useRef(split)
  useEffect(() => {
    splitRef.current = split
  }, [split])
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

  // Resize handle - persist to store on mouseup
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
      persistSplitPosition(splitRef.current)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [persistSplitPosition])

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

  // Scroll to target change block when requested
  useEffect(() => {
    if (targetChangeIndex == null || targetChangeIndex < 0) return
    if (targetChangeIndex >= changeRowIndices.length) return
    const rowIndex = changeRowIndices[targetChangeIndex]
    scrollRef.current?.scrollTo({
      top: rowIndex * ROW_HEIGHT,
      behavior: "smooth",
    })
  }, [scrollRequestId, targetChangeIndex, changeRowIndices])

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
              className="border border-card shrink-0 overflow-x-auto overflow-y-hidden"
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
              className="border border-card min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
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

// --- File list view components ---

function getFileName(path: string) {
  return path.split("/").pop() ?? path
}

interface FileListProps {
  status: GitStatus | null
  selectedFile: string | null
  expandedSections: Set<string>
  toggleSection: (section: string) => void
  onFileClick: (path: string, staged?: boolean) => void
  totalChanges: number
  isLoading: boolean
}

function FlatFileList({
  status,
  selectedFile,
  expandedSections,
  toggleSection,
  onFileClick,
  totalChanges,
  isLoading,
}: FileListProps) {
  return (
    <>
      {/* Staged */}
      {status?.staged && status.staged.length > 0 && (
        <div>
          <button
            className="glass-hover flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-diff-add-fg"
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
                  onClick={() => onFileClick(file.path, true)}
                >
                  <FileIcon status={file.status} />
                  <span className="text-foreground truncate">
                    {getFileName(file.path)}
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
            className="glass-hover flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-foreground"
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
                  onClick={() => onFileClick(file.path)}
                >
                  <FileIcon status={file.status} />
                  <span className="text-foreground truncate">
                    {getFileName(file.path)}
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
                  onClick={() => onFileClick(filePath)}
                >
                  <FilePlus className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">
                    {getFileName(filePath)}
                  </span>
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
    </>
  )
}

function TreeFileList({
  status,
  selectedFile,
  expandedSections,
  toggleSection,
  onFileClick,
  totalChanges,
  isLoading,
}: FileListProps) {
  const stagedTree = useMemo(() => {
    if (!status?.staged?.length) return null
    return buildFileTree(
      status.staged.map((f) => ({ path: f.path, status: f.status, staged: true })),
    )
  }, [status?.staged])

  const unstagedTree = useMemo(() => {
    if (!status?.unstaged?.length) return null
    return buildFileTree(
      status.unstaged.map((f) => ({ path: f.path, status: f.status, staged: false })),
    )
  }, [status?.unstaged])

  const untrackedTree = useMemo(() => {
    if (!status?.untracked?.length) return null
    return buildFileTree(
      status.untracked.map((p) => ({ path: p, status: "added" as const, staged: false })),
    )
  }, [status?.untracked])

  return (
    <>
      {/* Staged */}
      {stagedTree && (
        <div>
          <button
            className="glass-hover flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-diff-add-fg"
            onClick={() => toggleSection("staged")}
          >
            {expandedSections.has("staged") ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            Staged ({status!.staged.length})
          </button>
          {expandedSections.has("staged") && (
            <div className="pb-1">
              <FileTreeView
                node={stagedTree}
                selectedFile={selectedFile}
                onFileClick={onFileClick}
              />
            </div>
          )}
        </div>
      )}

      {/* Unstaged */}
      {unstagedTree && (
        <div>
          <button
            className="glass-hover flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-foreground"
            onClick={() => toggleSection("unstaged")}
          >
            {expandedSections.has("unstaged") ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            Changes ({status!.unstaged.length})
          </button>
          {expandedSections.has("unstaged") && (
            <div className="pb-1">
              <FileTreeView
                node={unstagedTree}
                selectedFile={selectedFile}
                onFileClick={onFileClick}
              />
            </div>
          )}
        </div>
      )}

      {/* Untracked */}
      {untrackedTree && (
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
            Untracked ({status!.untracked.length})
          </button>
          {expandedSections.has("untracked") && (
            <div className="pb-1">
              <FileTreeView
                node={untrackedTree}
                selectedFile={selectedFile}
                onFileClick={onFileClick}
              />
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
    </>
  )
}

export function GitChangesCard({ repoPath, pollInterval = 5000, className }: GitChangesCardProps) {
  const { status, isLoading, error, fetchStatus, fetchDiff } = useGitStatus({
    path: repoPath,
    pollInterval,
    autoStart: Boolean(repoPath),
  })

  // Persisted preferences from store
  const fileListView = useFileListView()
  const diffView = useDiffView()
  const expandedSectionsArr = useExpandedSections()
  const {
    setFileListView,
    setDiffView,
    toggleSection,
  } = useCodeLayoutActions()

  // Convert persisted array to Set for component use
  const expandedSections = useMemo(
    () => new Set(expandedSectionsArr),
    [expandedSectionsArr],
  )

  // Ephemeral state (not persisted)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null)
  const [isLoadingDiff, setIsLoadingDiff] = useState(false)

  const handleFileClick = useCallback(
    async (filePath: string, staged?: boolean) => {
      if (selectedFile === filePath) {
        setSelectedFile(null)
        setSelectedDiff(null)
        return
      }

      setSelectedFile(filePath)
      setIsLoadingDiff(true)
      setCurrentChangeIndex(0)
      pendingChangeNav.current = null
      const diff = await fetchDiff(filePath, { staged })
      setSelectedDiff(diff)
      setIsLoadingDiff(false)
    },
    [selectedFile, fetchDiff],
  )

  const handleRefresh = useCallback(() => {
    fetchStatus()
  }, [fetchStatus])

  const allFiles = useMemo(() => {
    const files: Array<{ path: string; staged: boolean }> = []
    for (const f of status?.staged ?? []) files.push({ path: f.path, staged: true })
    for (const f of status?.unstaged ?? []) files.push({ path: f.path, staged: false })
    for (const p of status?.untracked ?? []) files.push({ path: p, staged: false })
    return files
  }, [status])

  const currentFileIndex = useMemo(
    () => (selectedFile ? allFiles.findIndex((f) => f.path === selectedFile) : -1),
    [allFiles, selectedFile],
  )

  // Change block navigation
  const changePositions = useMemo(() => {
    if (!selectedDiff) return []
    const positions: Array<number> = []
    let inChange = false
    for (let i = 0; i < selectedDiff.lines.length; i++) {
      const kind = selectedDiff.lines[i].kind
      const isChange = kind === "add" || kind === "del"
      if (isChange && !inChange) positions.push(i)
      inChange = kind === "hunk" ? false : isChange
    }
    return positions
  }, [selectedDiff])

  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const [scrollRequestId, setScrollRequestId] = useState(0)
  const pendingChangeNav = useRef<"first" | "last" | null>(null)

  // After diff loads from a cross-file nav, scroll to pending change
  useEffect(() => {
    if (!isLoadingDiff && selectedDiff && pendingChangeNav.current !== null) {
      const idx =
        pendingChangeNav.current === "last"
          ? Math.max(0, changePositions.length - 1)
          : 0
      setCurrentChangeIndex(idx)
      setScrollRequestId((prev) => prev + 1)
      pendingChangeNav.current = null
    }
  }, [isLoadingDiff, selectedDiff, changePositions])

  const navigateChange = useCallback(
    (delta: 1 | -1) => {
      const nextChange = currentChangeIndex + delta

      if (nextChange >= 0 && nextChange < changePositions.length) {
        // Navigate within current file
        setCurrentChangeIndex(nextChange)
        setScrollRequestId((prev) => prev + 1)
      } else if (delta === 1 && currentFileIndex < allFiles.length - 1) {
        // Past last change → next file, first change
        const file = allFiles[currentFileIndex + 1]
        setSelectedFile(file.path)
        setIsLoadingDiff(true)
        pendingChangeNav.current = "first"
        fetchDiff(file.path, { staged: file.staged }).then((diff) => {
          setSelectedDiff(diff)
          setIsLoadingDiff(false)
        })
      } else if (delta === -1 && currentFileIndex > 0) {
        // Before first change → prev file, last change
        const file = allFiles[currentFileIndex - 1]
        setSelectedFile(file.path)
        setIsLoadingDiff(true)
        pendingChangeNav.current = "last"
        fetchDiff(file.path, { staged: file.staged }).then((diff) => {
          setSelectedDiff(diff)
          setIsLoadingDiff(false)
        })
      }
    },
    [currentChangeIndex, changePositions, currentFileIndex, allFiles, fetchDiff],
  )

  const canGoPrev = currentChangeIndex > 0 || currentFileIndex > 0
  const canGoNext =
    currentChangeIndex < changePositions.length - 1 ||
    currentFileIndex < allFiles.length - 1

  // Reset state when repoPath changes
  useEffect(() => {
    setSelectedFile(null)
    setSelectedDiff(null)
  }, [repoPath])

  if (!repoPath) {
    return (
      <div
        className={cn(
          "border-border bg-background flex flex-col items-center justify-center rounded-lg border p-8",
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
        "border-border bg-background flex flex-col overflow-hidden rounded-lg border",
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
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
              {totalChanges}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("size-6", fileListView === "flat" && "bg-muted")}
                onClick={() => setFileListView("flat")}
              >
                <List className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Flat list</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("size-6", fileListView === "tree" && "bg-muted")}
                onClick={() => setFileListView("tree")}
              >
                <ListTree className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Tree view</TooltipContent>
          </Tooltip>
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
      </div>

      {/* Error */}
      {error && (
        <div className="border-border border-b bg-destructive px-3 py-1 text-xs text-destructive-foreground">
          {error}
        </div>
      )}

      {/* File tree and diff */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* File list */}
        <div className="border-border w-64 flex-none overflow-y-auto border-r">
          {fileListView === "flat" ? (
            <FlatFileList
              status={status}
              selectedFile={selectedFile}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              onFileClick={handleFileClick}
              totalChanges={totalChanges}
              isLoading={isLoading}
            />
          ) : (
            <TreeFileList
              status={status}
              selectedFile={selectedFile}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              onFileClick={handleFileClick}
              totalChanges={totalChanges}
              isLoading={isLoading}
            />
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
                      className="size-6"
                      disabled={!canGoPrev || isLoadingDiff}
                      onClick={() => navigateChange(-1)}
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Previous change</TooltipContent>
                </Tooltip>
                {changePositions.length > 0 && (
                  <span className="text-muted-foreground min-w-[2rem] text-center text-[10px]">
                    {currentChangeIndex + 1}/{changePositions.length}
                  </span>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      disabled={!canGoNext || isLoadingDiff}
                      onClick={() => navigateChange(1)}
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Next change</TooltipContent>
                </Tooltip>
                <div className="border-border mx-1 h-4 border-l" />
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
              "bg-card min-h-0 flex-1",
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
                <DiffViewer
                  diff={selectedDiff}
                  targetChangeIndex={currentChangeIndex}
                  scrollRequestId={scrollRequestId}
                />
              ) : (
                <SideBySideDiffViewer
                  diff={selectedDiff}
                  targetChangeIndex={currentChangeIndex}
                  scrollRequestId={scrollRequestId}
                />
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
