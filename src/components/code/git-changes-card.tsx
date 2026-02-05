import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileEdit,
  FileMinus,
  FilePlus,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import type { FileDiff, GitFileChange } from "@/lib/code-types";
import { useGitStatus } from "@/hooks/use-git-status";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface GitChangesCardProps {
  repoPath?: string;
  className?: string;
}

function FileIcon({ status }: { status: GitFileChange["status"] }) {
  switch (status) {
    case "added":
      return <FilePlus className="size-4 text-emerald-400" />;
    case "deleted":
      return <FileMinus className="size-4 text-red-400" />;
    case "modified":
      return <FileEdit className="size-4 text-amber-400" />;
    case "renamed":
      return <File className="size-4 text-blue-400" />;
    default:
      return <File className="size-4 text-zinc-400" />;
  }
}

function DiffViewer({ diff }: { diff: FileDiff }) {
  if (!diff.lines.length) {
    return (
      <div className="px-4 py-2 text-xs text-zinc-500">
        No changes to display
      </div>
    );
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
            line.kind === "context" && "text-zinc-400",
          )}
        >
          <span className="w-8 text-right text-zinc-600 select-none">
            {line.oldLineno ?? ""}
          </span>
          <span className="w-8 text-right text-zinc-600 select-none">
            {line.newLineno ?? ""}
          </span>
          <span className="ml-2 flex-1">{line.content}</span>
        </div>
      ))}
    </div>
  );
}

export function GitChangesCard({ repoPath, className }: GitChangesCardProps) {
  const { status, isLoading, error, fetchStatus, fetchDiff } = useGitStatus({
    path: repoPath,
    pollInterval: 5000,
    autoStart: Boolean(repoPath),
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["staged", "unstaged", "untracked"]),
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<FileDiff | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleFileClick = useCallback(
    async (filePath: string) => {
      if (selectedFile === filePath) {
        setSelectedFile(null);
        setSelectedDiff(null);
        return;
      }

      setSelectedFile(filePath);
      setIsLoadingDiff(true);
      const diff = await fetchDiff(filePath);
      setSelectedDiff(diff);
      setIsLoadingDiff(false);
    },
    [selectedFile, fetchDiff],
  );

  const handleRefresh = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Reset state when repoPath changes
  useEffect(() => {
    setSelectedFile(null);
    setSelectedDiff(null);
  }, [repoPath]);

  if (!repoPath) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 p-8",
          className,
        )}
      >
        <GitBranch className="mb-2 size-8 text-zinc-600" />
        <p className="text-sm text-zinc-500">
          Select a repository to view changes
        </p>
      </div>
    );
  }

  const totalChanges =
    (status?.staged.length ?? 0) +
    (status?.unstaged.length ?? 0) +
    (status?.untracked.length ?? 0);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-zinc-400" />
          <span className="text-xs text-zinc-400">
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
        <div className="border-b border-zinc-800 bg-red-950 px-3 py-1 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* File tree and diff */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-64 flex-none overflow-y-auto border-r border-zinc-800">
          {/* Staged */}
          {status?.staged && status.staged.length > 0 && (
            <div>
              <button
                className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-400 hover:bg-zinc-900"
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
                        "flex w-full items-center gap-2 px-4 py-1 text-xs hover:bg-zinc-900",
                        selectedFile === file.path && "bg-zinc-800",
                      )}
                      onClick={() => handleFileClick(file.path)}
                    >
                      <FileIcon status={file.status} />
                      <span className="truncate text-zinc-300">
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
                className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-400 hover:bg-zinc-900"
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
                        "flex w-full items-center gap-2 px-4 py-1 text-xs hover:bg-zinc-900",
                        selectedFile === file.path && "bg-zinc-800",
                      )}
                      onClick={() => handleFileClick(file.path)}
                    >
                      <FileIcon status={file.status} />
                      <span className="truncate text-zinc-300">
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
                className="flex w-full items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-900"
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
                        "flex w-full items-center gap-2 px-4 py-1 text-xs hover:bg-zinc-900",
                        selectedFile === filePath && "bg-zinc-800",
                      )}
                      onClick={() => handleFileClick(filePath)}
                    >
                      <FilePlus className="size-4 text-zinc-500" />
                      <span className="truncate text-zinc-400">{filePath}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {totalChanges === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <p className="text-xs text-zinc-500">No changes detected</p>
            </div>
          )}
        </div>

        {/* Diff viewer */}
        <div className="flex-1 overflow-auto bg-zinc-900">
          {isLoadingDiff ? (
            <div className="flex h-full items-center justify-center">
              <RefreshCw className="size-4 animate-spin text-zinc-500" />
            </div>
          ) : selectedDiff ? (
            <DiffViewer diff={selectedDiff} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-500">
                Select a file to view changes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
