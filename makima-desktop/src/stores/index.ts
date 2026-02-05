// ============================================================================
// Stores - Centralized re-exports for all Zustand stores and selectors
// ============================================================================

// Settings Store
export {
  useSettingsStore,
  useSettingsHydrated,
  // Atomic selectors
  useMode,
  useIsSafeMode,
  useIsAutoMode,
  useAutoApproveReadOnly,
  useAutoApproveLowRisk,
  useCompactMode,
  useShowEventNotifications,
  useDefaultProvider,
  useDefaultModel,
  usePreferences,
  useOllamaConfig,
  useOpenAIConfig,
  useAnthropicConfig,
  useOpenAIAuthPreference,
  useAnthropicAuthPreference,
  useProviders,
  useSettingsActions,
} from "./settings-store";
export type { BridgeMode, SettingsStore } from "./settings-store";

// UI Store
export {
  useUIStore,
  // Atomic selectors
  useApprovalDrawerOpen,
  useTerminalDrawerOpen,
  useCreateAgentDialogOpen,
  useMobileSidebarOpen,
  useSelectedAgent,
  useSelectedSession,
  useSelectedRepo,
  useHasSelectedAgent,
  useHasSelectedSession,
  useHasSelectedRepo,
  useUIActions,
} from "./ui-store";
export type { UIStore } from "./ui-store";

// Provider Store
export {
  useProviderStore,
  // Atomic selectors
  useOllamaConnectionState,
  useOllamaConnected,
  useOllamaChecking,
  useOllamaModels,
  useIsLoadingModels,
  usePullingModel,
  usePullProgress,
  // Process management selectors
  useOllamaInstallation,
  useOllamaProcessStatus,
  useOllamaManagedByApp,
  useOllamaPid,
  useOllamaCanStart,
  useOllamaCanStop,
  // Auth selectors
  useAuthStatus,
  useIsAuthLoading,
  useAnthropicAvailability,
  useOpenaiAvailability,
  useOpenAIConfigured,
  useAnthropicConfigured,
  useOpenAISource,
  useAnthropicSource,
  useProviderActions,
} from "./provider-store"
export type { ProviderStore } from "./provider-store"

// Chat Store
export {
  useChatStore,
  // Atomic selectors
  useComposerValue,
  useComposerRows,
  useHasComposerContent,
  useSelectedProvider,
  useSelectedModel,
  useHasSelectedModel,
  useModelSelection,
  useTone,
  useChatActions,
} from "./chat-store";
export type { ChatStore } from "./chat-store";

// Conversation Store
export {
  useConversationStore,
  // Atomic selectors
  useConversationsList,
  useConversationsCount,
  useVisibleConversations,
  useActiveConversationId,
  useActiveConversation,
  useConversationById,
  useConversationsLoading,
  useConversationsError,
  useStreamingConversationIds,
  useIsConversationStreaming,
  useHasRunningExecution,
  useIsThinking,
  useIsStreaming,
  useIsThinkingOrStreaming,
  useInputState,
  useConversationActions,
} from "./conversation-store";
export type { ConversationStore } from "./conversation-store";

// Animation Store
export {
  useAnimationStore,
  // Atomic selectors
  useMessageDisplayedChars,
  useIsMessageAnimating,
  useAnimatingMessageIds,
  useAnimationActions,
} from "./animation-store";
export type { AnimationStore } from "./animation-store";

// Chat Domain Store (isolated conversations without repository)
export {
  useChatDomainStore,
  // Atomic selectors
  useChatDomainConversations,
  useChatDomainConversationsCount,
  useChatDomainVisibleConversations,
  useChatDomainActiveId,
  useChatDomainActiveConversation,
  useChatDomainLoading,
  useChatDomainError,
  useChatDomainHasRunningExecution,
  useChatDomainIsThinkingOrStreaming,
  useChatDomainActions,
} from "./chat-domain-store";
export type { ChatDomainStore } from "./chat-domain-store";

// Code Domain Store (isolated conversations with repository)
export {
  useCodeDomainStore,
  // Atomic selectors
  useCodeDomainConversations,
  useCodeDomainConversationsCount,
  useCodeDomainActiveId,
  useCodeDomainActiveConversation,
  useCodeDomainLoading,
  useCodeDomainError,
  useCodeDomainHasRunningExecution,
  useCodeDomainIsThinkingOrStreaming,
  useCodeDomainActions,
} from "./code-domain-store";
export type { CodeDomainStore } from "./code-domain-store";

// Work Domain Store (agents, sessions, runs, approvals)
export {
  useWorkDomainStore,
  // Agent selectors
  useWorkAgents,
  useWorkAgentsCount,
  useWorkActiveAgentId,
  useWorkActiveAgent,
  useWorkIsLoadingAgents,
  // Session selectors
  useWorkSessions,
  useWorkSessionsCount,
  useWorkActiveSessionId,
  useWorkActiveSession,
  useWorkIsLoadingSessions,
  useWorkAgentSessions,
  // Run selectors
  useWorkRuns,
  useWorkRunsCount,
  useWorkActiveRunId,
  useWorkActiveRun,
  useWorkSessionRuns,
  useWorkRunningRuns,
  useWorkHasRunningRuns,
  // Approval selectors
  useWorkApprovals,
  useWorkApprovalsCount,
  useWorkPendingApprovals,
  useWorkPendingApprovalsCount,
  useWorkHasPendingApprovals,
  // Mode selectors
  useWorkExecutionMode,
  useWorkIsSafeMode,
  useWorkIsAutoMode,
  // Error selectors
  useWorkError,
  // Actions
  useWorkDomainActions,
} from "./work-domain-store";
export type { WorkDomainStore } from "./work-domain-store";
