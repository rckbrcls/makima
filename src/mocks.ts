// =============================================================================
// Mock Data for UI Development
// =============================================================================
// This file contains all mock data for both Agent Hub and Command Hub components.
// Use these mocks during initial interface development before Rust integration.

import type {
  // Repos types (formerly Command Hub)
  Repository,
  Command,
  LiveExecution,
  RunQueueItem,
  Pipeline,
  ExecutionHistoryItem,
  HistoryStats,
  ExtendedStats,
  DashboardState,
} from "./components/repos/types";

import type {
  // Agents types (formerly Agent Hub)
  Agent,
  Session,
  Action,
  Approval,
  AgentEvent,
  Artifact,
  AgentWithRepos,
  ApprovalWithAction,
  AgentDashboardState,
  SessionWithDetails,
  AgentWithStats,
} from "./components/agents/types";

// =============================================================================
// Command Hub Mocks
// =============================================================================

export const mockRepositories: Repository[] = [
  {
    name: "makima",
    path: "/Users/dev/codes/makima",
    branch: "main",
    status: "active",
    tech: ["TypeScript", "React", "Tauri", "Rust"],
    lastRun: "2 min ago",
    running: "pnpm dev",
  },
  {
    name: "api-server",
    path: "/Users/dev/codes/api-server",
    branch: "develop",
    status: "idle",
    tech: ["Node.js", "Express", "PostgreSQL"],
    lastRun: "1 hour ago",
    running: "",
  },
  {
    name: "mobile-app",
    path: "/Users/dev/codes/mobile-app",
    branch: "feature/auth",
    status: "warn",
    tech: ["Swift", "SwiftUI", "CoreData"],
    lastRun: "30 min ago",
    running: "",
  },
  {
    name: "docs-site",
    path: "/Users/dev/codes/docs-site",
    branch: "main",
    status: "idle",
    tech: ["Astro", "MDX", "Tailwind"],
    lastRun: "3 hours ago",
    running: "",
  },
];

export const mockCommands: Command[] = [
  {
    name: "Dev Server",
    command: "pnpm dev",
    type: "run",
    status: "running",
    duration: "15:32",
    lastRun: "now",
    repo: "makima",
  },
  {
    name: "Build",
    command: "pnpm build",
    type: "build",
    status: "success",
    duration: "45s",
    lastRun: "2 hours ago",
    repo: "makima",
  },
  {
    name: "Type Check",
    command: "pnpm tsc --noEmit",
    type: "check",
    status: "success",
    duration: "12s",
    lastRun: "30 min ago",
    repo: "makima",
  },
  {
    name: "Lint",
    command: "pnpm lint",
    type: "lint",
    status: "failed",
    duration: "8s",
    lastRun: "1 hour ago",
    repo: "api-server",
  },
  {
    name: "Test Suite",
    command: "pnpm test",
    type: "test",
    status: "queued",
    duration: "2m 15s",
    lastRun: "1 day ago",
    repo: "api-server",
  },
  {
    name: "Bundle Analyze",
    command: "pnpm analyze",
    type: "bundle",
    status: "idle",
    duration: "1m 30s",
    lastRun: "5 days ago",
    repo: "docs-site",
  },
];

export const mockLiveExecutions: LiveExecution[] = [
  {
    repo: "makima",
    command: "pnpm dev",
    pid: 12345,
    cpu: "2.5%",
    ram: "256MB",
    logs: [
      { line: "VITE v5.0.0  ready in 500ms", stream: "stdout" },
      { line: "  ➜  Local:   http://localhost:5173/", stream: "stdout" },
      { line: "  ➜  Network: use --host to expose", stream: "stdout" },
      { line: "[HMR] Connected", stream: "stdout" },
      { line: "Warning: React DevTools detected", stream: "stderr" },
      { line: "[TypeScript] Watching for file changes...", stream: "stdout" },
    ],
  },
  {
    repo: "api-server",
    command: "pnpm dev",
    pid: 12346,
    cpu: "1.2%",
    ram: "180MB",
    logs: [
      { line: "Server starting...", stream: "stdout" },
      { line: "Connected to database", stream: "stdout" },
      { line: "Listening on port 3000", stream: "stdout" },
    ],
  },
];

export const mockRunQueue: RunQueueItem[] = [
  {
    id: 1,
    name: "Test Suite",
    repo: "api-server",
    command: "pnpm test",
    commandType: "test",
    queuedAt: "2 min ago",
  },
  {
    id: 2,
    name: "Build Production",
    repo: "makima",
    command: "pnpm build:prod",
    commandType: "build",
    queuedAt: "5 min ago",
  },
  {
    id: 3,
    name: "Lint Fix",
    repo: "mobile-app",
    command: "swiftlint --fix",
    commandType: "lint",
    queuedAt: "10 min ago",
  },
];

export const mockPipelines: Pipeline[] = [
  {
    repo: "makima",
    steps: [
      { label: "Install", state: "done" },
      { label: "Lint", state: "done" },
      { label: "Type Check", state: "running" },
      { label: "Test", state: "pending" },
      { label: "Build", state: "pending" },
    ],
  },
  {
    repo: "api-server",
    steps: [
      { label: "Install", state: "done" },
      { label: "Lint", state: "done" },
      { label: "Test", state: "done" },
      { label: "Build", state: "done" },
      { label: "Deploy", state: "running" },
    ],
  },
];

export const mockExecutionHistory: ExecutionHistoryItem[] = [
  {
    id: 1,
    name: "Build",
    repo: "makima",
    status: "success",
    duration: "45s",
    timestamp: "2026-01-30T14:30:00Z",
  },
  {
    id: 2,
    name: "Lint",
    repo: "api-server",
    status: "failed",
    duration: "8s",
    timestamp: "2026-01-30T14:25:00Z",
  },
  {
    id: 3,
    name: "Test Suite",
    repo: "mobile-app",
    status: "success",
    duration: "2m 15s",
    timestamp: "2026-01-30T14:00:00Z",
  },
  {
    id: 4,
    name: "Dev Server",
    repo: "makima",
    status: "stopped",
    duration: "1h 15m",
    timestamp: "2026-01-30T13:00:00Z",
  },
  {
    id: 5,
    name: "Type Check",
    repo: "docs-site",
    status: "success",
    duration: "15s",
    timestamp: "2026-01-30T12:30:00Z",
  },
];

export const mockHistoryStats: HistoryStats = {
  totalRuns: 156,
  successRate: "87%",
  avgDuration: "1m 23s",
};

export const mockExtendedStats: ExtendedStats = {
  totalRuns: 156,
  successRate: "87%",
  failureRate: "13%",
  avgDuration: "1m 23s",
  totalDuration: "3h 45m",
  fastestRun: "3s",
  slowestRun: "15m 30s",
  commandsInQueue: 3,
  activeRepositories: 4,
  totalCommands: 24,
  runningCommands: 2,
};

export const mockCommandHubDashboard: DashboardState = {
  repositories: mockRepositories,
  commands: mockCommands,
  liveExecutions: mockLiveExecutions,
  runQueue: mockRunQueue,
  pipelines: mockPipelines,
  executionHistory: mockExecutionHistory,
  historyStats: mockHistoryStats,
};

// =============================================================================
// Agent Hub Mocks
// =============================================================================

export const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Luna",
    provider: "cli",
    model: "claude-sonnet-4-20250514",
    status: "running",
    createdAt: "2026-01-30T10:00:00Z",
    updatedAt: "2026-01-30T16:00:00Z",
  },
  {
    id: "agent-2",
    name: "Kai",
    provider: "api",
    model: "gpt-4o",
    status: "idle",
    createdAt: "2026-01-25T08:00:00Z",
    updatedAt: "2026-01-30T14:00:00Z",
  },
  {
    id: "agent-3",
    name: "Nova",
    provider: "local",
    model: "codellama:13b",
    status: "error",
    createdAt: "2026-01-20T12:00:00Z",
    updatedAt: "2026-01-30T15:30:00Z",
  },
  {
    id: "agent-4",
    name: "Atlas",
    provider: "cli",
    model: "gemini-2.0-flash",
    status: "active",
    createdAt: "2026-01-28T09:00:00Z",
    updatedAt: "2026-01-30T16:05:00Z",
  },
];

export const mockSessions: Session[] = [
  {
    id: "session-1",
    agentId: "agent-1",
    goal: "Refactor authentication system to use OAuth 2.0",
    state: "active",
    createdAt: "2026-01-30T14:00:00Z",
    updatedAt: "2026-01-30T16:00:00Z",
  },
  {
    id: "session-2",
    agentId: "agent-2",
    goal: "Add unit tests for user service",
    state: "done",
    createdAt: "2026-01-30T10:00:00Z",
    updatedAt: "2026-01-30T12:00:00Z",
  },
  {
    id: "session-3",
    agentId: "agent-3",
    goal: "Fix memory leak in data processing pipeline",
    state: "failed",
    createdAt: "2026-01-30T13:00:00Z",
    updatedAt: "2026-01-30T15:30:00Z",
  },
  {
    id: "session-4",
    agentId: "agent-4",
    goal: "Implement dark mode support across all components",
    state: "active",
    createdAt: "2026-01-30T15:00:00Z",
    updatedAt: "2026-01-30T16:05:00Z",
  },
];

export const mockActions: Action[] = [
  {
    id: "action-1",
    sessionId: "session-1",
    actionType: "read_file",
    status: "done",
    payload: JSON.stringify({
      path: "src/auth/oauth.ts",
      startLine: 1,
      endLine: 100,
    }),
    summary: "Reading OAuth configuration file",
    createdAt: "2026-01-30T14:05:00Z",
    updatedAt: "2026-01-30T14:05:30Z",
  },
  {
    id: "action-2",
    sessionId: "session-1",
    actionType: "edit_file",
    status: "blocked",
    payload: JSON.stringify({
      path: "src/auth/oauth.ts",
      diff: `@@ -10,7 +10,12 @@
-import { basicAuth } from './basic';
+import { OAuth2Client } from 'google-auth-library';
+import { config } from '../config';

 export class AuthService {
-  authenticate(user: string, password: string) {
+  private oauth2Client: OAuth2Client;
+
+  constructor() {
+    this.oauth2Client = new OAuth2Client(config.clientId);
+  }`,
    }),
    summary: "Updating AuthService to use OAuth2Client",
    createdAt: "2026-01-30T14:10:00Z",
    updatedAt: "2026-01-30T14:10:00Z",
  },
  {
    id: "action-3",
    sessionId: "session-1",
    actionType: "run_command",
    status: "pending",
    payload: JSON.stringify({
      command: "pnpm test",
      args: ["--coverage"],
      cwd: "/project",
    }),
    summary: "Running test suite with coverage",
    createdAt: "2026-01-30T14:15:00Z",
    updatedAt: "2026-01-30T14:15:00Z",
  },
  {
    id: "action-4",
    sessionId: "session-4",
    actionType: "search_web",
    status: "blocked",
    payload: JSON.stringify({
      query: "CSS custom properties dark mode best practices 2026",
    }),
    summary: "Researching dark mode implementation patterns",
    createdAt: "2026-01-30T15:10:00Z",
    updatedAt: "2026-01-30T15:10:00Z",
  },
  {
    id: "action-5",
    sessionId: "session-2",
    actionType: "write_file",
    status: "done",
    payload: JSON.stringify({
      path: "src/services/__tests__/user.service.test.ts",
      content: `import { UserService } from '../user.service';

describe('UserService', () => {
  it('should create a new user', async () => {
    const service = new UserService();
    const user = await service.create({ name: 'Test' });
    expect(user.id).toBeDefined();
  });
});`,
    }),
    summary: "Creating user service test file",
    createdAt: "2026-01-30T11:30:00Z",
    updatedAt: "2026-01-30T11:31:00Z",
  },
  {
    id: "action-6",
    sessionId: "session-3",
    actionType: "run_command",
    status: "failed",
    payload: JSON.stringify({
      command: "node --inspect analyzer.js",
      cwd: "/project/tools",
    }),
    summary: "Running memory analyzer",
    createdAt: "2026-01-30T14:00:00Z",
    updatedAt: "2026-01-30T15:30:00Z",
  },
];

export const mockApprovals: Approval[] = [
  {
    id: "approval-1",
    actionId: "action-2",
    state: "pending",
    createdAt: "2026-01-30T14:10:00Z",
  },
  {
    id: "approval-2",
    actionId: "action-4",
    state: "pending",
    createdAt: "2026-01-30T15:10:00Z",
  },
  {
    id: "approval-3",
    actionId: "action-5",
    state: "approved",
    reviewer: "user",
    reason: "Looks good",
    createdAt: "2026-01-30T11:25:00Z",
    resolvedAt: "2026-01-30T11:28:00Z",
  },
];

export const mockEvents: AgentEvent[] = [
  {
    id: "event-1",
    sessionId: "session-1",
    agentId: "agent-1",
    level: "info",
    message: "Session started: Refactor authentication system",
    source: "system",
    createdAt: "2026-01-30T14:00:00Z",
  },
  {
    id: "event-2",
    sessionId: "session-1",
    agentId: "agent-1",
    level: "info",
    message: "Reading OAuth configuration file...",
    source: "cli",
    createdAt: "2026-01-30T14:05:00Z",
  },
  {
    id: "event-3",
    sessionId: "session-1",
    agentId: "agent-1",
    level: "warning",
    message: "Action blocked: Waiting for approval to edit file",
    source: "system",
    createdAt: "2026-01-30T14:10:00Z",
  },
  {
    id: "event-4",
    sessionId: "session-3",
    agentId: "agent-3",
    level: "error",
    message: "Memory analyzer crashed: Out of memory",
    source: "tool",
    createdAt: "2026-01-30T15:30:00Z",
  },
  {
    id: "event-5",
    sessionId: "session-4",
    agentId: "agent-4",
    level: "debug",
    message: "Analyzing component structure for theme support",
    source: "cli",
    createdAt: "2026-01-30T15:05:00Z",
  },
  {
    id: "event-6",
    agentId: "agent-2",
    level: "info",
    message: "Agent Kai is now idle",
    source: "system",
    createdAt: "2026-01-30T12:00:00Z",
  },
];

export const mockArtifacts: Artifact[] = [
  {
    id: "artifact-1",
    sessionId: "session-1",
    kind: "log",
    data: JSON.stringify({
      lines: [
        "[14:05:00] Starting file read operation",
        "[14:05:15] File read complete: 100 lines",
        "[14:05:16] Analyzing OAuth configuration...",
      ],
    }),
    createdAt: "2026-01-30T14:05:30Z",
  },
  {
    id: "artifact-2",
    sessionId: "session-1",
    kind: "diff",
    data: JSON.stringify({
      path: "src/auth/oauth.ts",
      additions: 8,
      deletions: 3,
      hunks: [
        {
          header: "@@ -10,7 +10,12 @@",
          lines: [
            '-import { basicAuth } from "./basic";',
            '+import { OAuth2Client } from "google-auth-library";',
          ],
        },
      ],
    }),
    createdAt: "2026-01-30T14:10:00Z",
  },
  {
    id: "artifact-3",
    sessionId: "session-2",
    kind: "file",
    data: JSON.stringify({
      path: "src/services/__tests__/user.service.test.ts",
      language: "typescript",
      size: 256,
    }),
    createdAt: "2026-01-30T11:31:00Z",
  },
];

// Combined mock data with repos
export const mockAgentsWithRepos: AgentWithRepos[] = [
  {
    ...mockAgents[0],
    repos: ["makima", "api-server"],
    currentSession: mockSessions[0],
  },
  {
    ...mockAgents[1],
    repos: ["api-server"],
    currentSession: undefined,
  },
  {
    ...mockAgents[2],
    repos: ["data-pipeline"],
    currentSession: mockSessions[2],
  },
  {
    ...mockAgents[3],
    repos: ["makima", "mobile-app", "docs-site"],
    currentSession: mockSessions[3],
  },
];

export const mockApprovalsWithAction: ApprovalWithAction[] = [
  {
    ...mockApprovals[0],
    action: mockActions[1], // edit_file action
  },
  {
    ...mockApprovals[1],
    action: mockActions[3], // search_web action
  },
];

export const mockAgentDashboard: AgentDashboardState = {
  agents: mockAgentsWithRepos,
  sessions: mockSessions,
  pendingApprovals: mockApprovalsWithAction,
  recentEvents: mockEvents.slice(0, 5),
  globalMode: "safe",
};

// Session with full details for the Session Panel
export const mockSessionWithDetails: SessionWithDetails = {
  ...mockSessions[0],
  agent: mockAgents[0],
  actions: mockActions.filter((a) => a.sessionId === "session-1"),
  events: mockEvents.filter((e) => e.sessionId === "session-1"),
};

// Agent with stats for the Agent List view
export const mockAgentsWithStats: AgentWithStats[] = [
  {
    ...mockAgents[0],
    totalSessions: 15,
    totalActions: 234,
    successRate: "92%",
    lastSessionAt: "2026-01-30T16:00:00Z",
  },
  {
    ...mockAgents[1],
    totalSessions: 8,
    totalActions: 156,
    successRate: "88%",
    lastSessionAt: "2026-01-30T12:00:00Z",
  },
  {
    ...mockAgents[2],
    totalSessions: 3,
    totalActions: 45,
    successRate: "67%",
    lastSessionAt: "2026-01-30T15:30:00Z",
  },
  {
    ...mockAgents[3],
    totalSessions: 12,
    totalActions: 189,
    successRate: "95%",
    lastSessionAt: "2026-01-30T16:05:00Z",
  },
];

// =============================================================================
// Helper functions for mock data manipulation
// =============================================================================

/**
 * Get an agent by ID
 */
export const getMockAgentById = (id: string): Agent | undefined =>
  mockAgents.find((a) => a.id === id);

/**
 * Get all sessions for an agent
 */
export const getMockSessionsByAgentId = (agentId: string): Session[] =>
  mockSessions.filter((s) => s.agentId === agentId);

/**
 * Get all actions for a session
 */
export const getMockActionsBySessionId = (sessionId: string): Action[] =>
  mockActions.filter((a) => a.sessionId === sessionId);

/**
 * Get pending approvals for an agent
 */
export const getMockPendingApprovalsByAgentId = (
  agentId: string,
): ApprovalWithAction[] => {
  const agentSessions = getMockSessionsByAgentId(agentId);
  const sessionIds = new Set(agentSessions.map((s) => s.id));

  return mockApprovalsWithAction.filter(
    (approval) =>
      approval.state === "pending" &&
      approval.action &&
      sessionIds.has(approval.action.sessionId),
  );
};

/**
 * Get events for an agent (optionally filtered by session)
 */
export const getMockEventsByAgentId = (
  agentId: string,
  sessionId?: string,
): AgentEvent[] =>
  mockEvents.filter(
    (e) =>
      e.agentId === agentId &&
      (sessionId === undefined || e.sessionId === sessionId),
  );

/**
 * Get a repository by name
 */
export const getMockRepositoryByName = (name: string): Repository | undefined =>
  mockRepositories.find((r) => r.name === name);

/**
 * Get commands by repository
 */
export const getMockCommandsByRepo = (repo: string): Command[] =>
  mockCommands.filter((c) => c.repo === repo);

/**
 * Get live execution by repository
 */
export const getMockLiveExecutionByRepo = (
  repo: string,
): LiveExecution | undefined => mockLiveExecutions.find((e) => e.repo === repo);
