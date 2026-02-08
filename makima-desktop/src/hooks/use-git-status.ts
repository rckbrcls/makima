import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FileDiff,
  FileDiffDb,
  GitStatus,
  GitStatusDb,
} from "@/lib/code-types";
import { mapFileDiff, mapGitStatus } from "@/lib/code-types";

export interface UseGitStatusOptions {
  path?: string;
  pollInterval?: number; // in ms, 0 to disable polling
  autoStart?: boolean;
}

export function useGitStatus(options: UseGitStatusOptions = {}) {
  const { path, pollInterval = 3000, autoStart = true } = options;

  const [status, setStatus] = useState<GitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pathRef = useRef(path);

  // Keep pathRef updated
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const fetchStatus = useCallback(
    async (repoPath?: string): Promise<GitStatus | null> => {
      const targetPath = repoPath ?? pathRef.current;
      if (!targetPath) return null;

      setIsLoading(true);
      setError(null);
      try {
        const result = await invoke<GitStatusDb>("git_status", {
          path: targetPath,
        });
        const gitStatus = mapGitStatus(result);
        setStatus(gitStatus);
        return gitStatus;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const fetchDiff = useCallback(
    async (
      filePath: string,
      options?: { repoPath?: string; staged?: boolean },
    ): Promise<FileDiff | null> => {
      const targetPath = options?.repoPath ?? pathRef.current;
      if (!targetPath) return null;

      try {
        const result = await invoke<FileDiffDb>("git_diff", {
          repoPath: targetPath,
          filePath,
          staged: options?.staged ?? false,
        });
        return mapFileDiff(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [],
  );

  const fetchAllDiffs = useCallback(
    async (repoPath?: string): Promise<Array<FileDiff>> => {
      const targetPath = repoPath ?? pathRef.current;
      if (!targetPath) return [];

      try {
        const result = await invoke<Array<FileDiffDb>>("git_diff_all", {
          repoPath: targetPath,
        });
        return result.map(mapFileDiff);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return [];
      }
    },
    [],
  );

  const getCurrentBranch = useCallback(
    async (repoPath?: string): Promise<string | null> => {
      const targetPath = repoPath ?? pathRef.current;
      if (!targetPath) return null;

      try {
        return await invoke<string>("git_current_branch", { path: targetPath });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [],
  );

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    if (pollInterval <= 0) return;
    if (!pathRef.current) return;

    fetchStatus();
    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, pollInterval);
  }, [pollInterval, fetchStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-start polling when path changes
  useEffect(() => {
    if (autoStart && path) {
      startPolling();
    }
    return () => {
      stopPolling();
    };
  }, [path, autoStart, startPolling, stopPolling]);

  return {
    status,
    isLoading,
    error,
    fetchStatus,
    fetchDiff,
    fetchAllDiffs,
    getCurrentBranch,
    startPolling,
    stopPolling,
  };
}
