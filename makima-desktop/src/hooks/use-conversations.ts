import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatItem,
  ChatMessage,
  Conversation,
  ConversationState,
  ConversationStatus,
} from "@/components/main/jarvis-types";

interface DbConversationSummary {
  id: string;
  title: string;
  summary: string;
  status: string;
  state: string;
  created_at: number;
  updated_at: number;
  repository_id: string | null;
}

interface DbMessageMeta {
  provider: string;
  model: string;
  tone: string;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  role: string;
  state: string;
  content: string;
  created_at: number;
  meta: DbMessageMeta;
  sort_order: number;
}

interface DbConversation {
  id: string;
  title: string;
  summary: string;
  status: string;
  state: string;
  created_at: number;
  updated_at: number;
  repository_id: string | null;
  messages: Array<DbMessage>;
}

function dbMessageToChatItem(msg: DbMessage): ChatItem {
  return {
    id: msg.id,
    kind: "message",
    message: {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      state: msg.state as ChatMessage["state"],
      content: msg.content,
      createdAt: msg.created_at,
      meta: {
        provider: msg.meta.provider,
        model: msg.meta.model,
        tone: msg.meta.tone,
      },
    },
  };
}

function dbConversationToConversation(dbConv: DbConversation): Conversation {
  return {
    id: dbConv.id,
    title: dbConv.title,
    summary: dbConv.summary,
    status: dbConv.status as ConversationStatus,
    state: dbConv.state as ConversationState,
    createdAt: dbConv.created_at,
    updatedAt: dbConv.updated_at,
    repositoryId: dbConv.repository_id ?? undefined,
    items: dbConv.messages.map(dbMessageToChatItem),
  };
}

function dbSummaryToConversation(summary: DbConversationSummary): Conversation {
  return {
    id: summary.id,
    title: summary.title,
    summary: summary.summary,
    status: summary.status as ConversationStatus,
    state: summary.state as ConversationState,
    createdAt: summary.created_at,
    updatedAt: summary.updated_at,
    repositoryId: summary.repository_id ?? undefined,
    items: [],
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Array<Conversation>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedConversationIds = useRef<Set<string>>(new Set());

  const loadConversationList = useCallback(async () => {
    try {
      const summaries = await invoke<Array<DbConversationSummary>>(
        "db_list_conversations",
      );
      setConversations((prev) => {
        const existingMap = new Map(prev.map((c) => [c.id, c]));
        return summaries.map((summary) => {
          const existing = existingMap.get(summary.id);
          if (existing && loadedConversationIds.current.has(summary.id)) {
            return {
              ...existing,
              title: summary.title,
              summary: summary.summary,
              status: summary.status as ConversationStatus,
              state: summary.state as ConversationState,
              updatedAt: summary.updated_at,
              repositoryId: summary.repository_id ?? undefined,
            };
          }
          return dbSummaryToConversation(summary);
        });
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      try {
        const dbConv = await invoke<DbConversation | null>(
          "db_get_conversation",
          { id },
        );
        if (!dbConv) return null;

        const conversation = dbConversationToConversation(dbConv);
        loadedConversationIds.current.add(id);

        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === id);
          if (index === -1) return prev;
          const next = [...prev];
          next[index] = conversation;
          return next;
        });

        return conversation;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [],
  );

  const createConversation = useCallback(
    async (
      title: string,
      repositoryId?: string,
    ): Promise<Conversation | null> => {
      try {
        const dbConv = await invoke<DbConversation>("db_create_conversation", {
          title,
          repositoryId: repositoryId ?? null,
        });
        const conversation = dbConversationToConversation(dbConv);
        loadedConversationIds.current.add(conversation.id);
        setConversations((prev) => [conversation, ...prev]);
        return conversation;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [],
  );

  const updateConversation = useCallback(
    async (
      id: string,
      updates: {
        title?: string;
        summary?: string;
        status?: string;
        state?: string;
      },
    ): Promise<boolean> => {
      try {
        await invoke<boolean>("db_update_conversation", {
          id,
          title: updates.title ?? null,
          summary: updates.summary ?? null,
          status: updates.status ?? null,
          conversationState: updates.state ?? null,
        });

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              ...(updates.title !== undefined && { title: updates.title }),
              ...(updates.summary !== undefined && {
                summary: updates.summary,
              }),
              ...(updates.status !== undefined && {
                status: updates.status as ConversationStatus,
              }),
              ...(updates.state !== undefined && {
                state: updates.state as ConversationState,
              }),
              updatedAt: Date.now(),
            };
          }),
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [],
  );

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await invoke<boolean>("db_delete_conversation", { id });
        loadedConversationIds.current.delete(id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [],
  );

  const addMessage = useCallback(
    async (
      conversationId: string,
      message: {
        id: string;
        role: string;
        state: string;
        content: string;
        createdAt: number;
        provider: string;
        model: string;
        tone: string;
      },
    ): Promise<boolean> => {
      try {
        await invoke("db_add_message", {
          conversationId,
          id: message.id,
          role: message.role,
          messageState: message.state,
          content: message.content,
          createdAt: message.createdAt,
          provider: message.provider,
          model: message.model,
          tone: message.tone,
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [],
  );

  const updateMessage = useCallback(
    async (
      id: string,
      updates: {
        content?: string;
        state?: string;
      },
    ): Promise<boolean> => {
      try {
        await invoke<boolean>("db_update_message", {
          id,
          content: updates.content ?? null,
          messageState: updates.state ?? null,
        });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [],
  );

  const setConversationsLocal = useCallback(
    (updater: React.SetStateAction<Array<Conversation>>) => {
      setConversations(updater);
    },
    [],
  );

  useEffect(() => {
    loadConversationList();
  }, [loadConversationList]);

  return {
    conversations,
    isLoading,
    error,
    loadConversationList,
    loadConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    setConversations: setConversationsLocal,
  };
}
