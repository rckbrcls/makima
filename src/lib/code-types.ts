export interface Repository {
  id: string
  name: string
  path: string
  branch: string
  tech: string[]
  status: 'active' | 'idle' | 'warn' | 'error'
  createdAt: number
  updatedAt: number
}

export interface GitFileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
}

export interface GitStatus {
  branch: string
  staged: GitFileChange[]
  unstaged: GitFileChange[]
  untracked: string[]
}

export interface DiffLine {
  kind: 'context' | 'add' | 'del' | 'hunk'
  content: string
  oldLineno?: number
  newLineno?: number
}

export interface FileDiff {
  path: string
  lines: DiffLine[]
}

export interface PtySession {
  sessionId: string
  pid: number
}

export interface PtyOutputPayload {
  sessionId: string
  data: string
}

export interface PtyExitPayload {
  sessionId: string
  exitCode?: number
}

// Database response types (snake_case from Rust)
export interface RepositoryDb {
  id: string
  name: string
  path: string
  branch: string
  tech: string[]
  status: string
  created_at: number
  updated_at: number
}

export interface GitStatusDb {
  branch: string
  staged: { path: string; status: string }[]
  unstaged: { path: string; status: string }[]
  untracked: string[]
}

export interface FileDiffDb {
  path: string
  lines: {
    kind: string
    content: string
    old_lineno?: number
    new_lineno?: number
  }[]
}

export interface PtySessionDb {
  sessionId: string
  pid: number
}

// Converters
export function mapRepository(db: RepositoryDb): Repository {
  return {
    id: db.id,
    name: db.name,
    path: db.path,
    branch: db.branch,
    tech: db.tech,
    status: db.status as Repository['status'],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function mapGitStatus(db: GitStatusDb): GitStatus {
  return {
    branch: db.branch,
    staged: db.staged.map((f) => ({
      path: f.path,
      status: f.status as GitFileChange['status'],
    })),
    unstaged: db.unstaged.map((f) => ({
      path: f.path,
      status: f.status as GitFileChange['status'],
    })),
    untracked: db.untracked,
  }
}

export function mapFileDiff(db: FileDiffDb): FileDiff {
  return {
    path: db.path,
    lines: db.lines.map((l) => ({
      kind: l.kind as DiffLine['kind'],
      content: l.content,
      oldLineno: l.old_lineno,
      newLineno: l.new_lineno,
    })),
  }
}

export function mapPtySession(db: PtySessionDb): PtySession {
  return {
    sessionId: db.sessionId,
    pid: db.pid,
  }
}
