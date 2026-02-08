export interface Repository {
  id: string;
  name: string;
  path: string;
  branch: string;
  tech: Array<string>;
  status: "active" | "idle" | "warn" | "error";
  createdAt: number;
  updatedAt: number;
}

export interface GitFileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
}

export interface GitStatus {
  branch: string;
  staged: Array<GitFileChange>;
  unstaged: Array<GitFileChange>;
  untracked: Array<string>;
}

export interface DiffLine {
  kind: "context" | "add" | "del" | "hunk";
  content: string;
  oldLineno?: number;
  newLineno?: number;
}

export interface FileDiff {
  path: string;
  lines: Array<DiffLine>;
}

export interface PtySession {
  sessionId: string;
  pid: number;
}

export interface PtyOutputPayload {
  sessionId: string;
  seq: number;
  data: string;
}

export interface PtyExitPayload {
  sessionId: string;
  exitCode?: number;
}

// AI CLI types
export interface AiCliInfo {
  name: string
  command: string
  version: string | null
  installed: boolean
}

export interface AiCliDetectionResult {
  clis: Array<AiCliInfo>
}

export interface CliSession {
  id: string
  repositoryId: string
  cliName: string
  cliCommand: string
  ptySessionId: string | null
  status: "idle" | "running" | "exited" | "error"
  startedAt: number
  exitCode?: number
  resumeSessionId?: string
}

// CLI Session database types (snake_case from Rust)
export interface CliSessionDb {
  id: string
  repository_id: string
  cli_name: string
  cli_command: string
  status: string
  exit_code: number | null
  resume_session_id: string | null
  started_at: number
  created_at: number
  updated_at: number
}

export function mapCliSessionFromDb(db: CliSessionDb): CliSession {
  return {
    id: db.id,
    repositoryId: db.repository_id,
    cliName: db.cli_name,
    cliCommand: db.cli_command,
    ptySessionId: null,
    status: db.status as CliSession["status"],
    startedAt: db.started_at,
    exitCode: db.exit_code ?? undefined,
    resumeSessionId: db.resume_session_id ?? undefined,
  }
}

// Database response types (snake_case from Rust)
export interface RepositoryDb {
  id: string;
  name: string;
  path: string;
  branch: string;
  tech: Array<string>;
  status: string;
  created_at: number;
  updated_at: number;
}

export interface GitStatusDb {
  branch: string;
  staged: Array<{ path: string; status: string }>;
  unstaged: Array<{ path: string; status: string }>;
  untracked: Array<string>;
}

export interface FileDiffDb {
  path: string;
  lines: Array<{
    kind: string;
    content: string;
    old_lineno?: number;
    new_lineno?: number;
  }>;
}

export interface PtySessionDb {
  sessionId: string;
  pid: number;
}

// Converters
export function mapRepository(db: RepositoryDb): Repository {
  return {
    id: db.id,
    name: db.name,
    path: db.path,
    branch: db.branch,
    tech: db.tech,
    status: db.status as Repository["status"],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapGitStatus(db: GitStatusDb): GitStatus {
  return {
    branch: db.branch,
    staged: db.staged.map((f) => ({
      path: f.path,
      status: f.status as GitFileChange["status"],
    })),
    unstaged: db.unstaged.map((f) => ({
      path: f.path,
      status: f.status as GitFileChange["status"],
    })),
    untracked: db.untracked,
  };
}

export function mapFileDiff(db: FileDiffDb): FileDiff {
  return {
    path: db.path,
    lines: db.lines.map((l) => ({
      kind: l.kind as DiffLine["kind"],
      content: l.content,
      oldLineno: l.old_lineno,
      newLineno: l.new_lineno,
    })),
  };
}

export function mapPtySession(db: PtySessionDb): PtySession {
  return {
    sessionId: db.sessionId,
    pid: db.pid,
  };
}
