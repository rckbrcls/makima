import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type {
  AuthSourceAvailability,
  AuthStatus,
  ResolvedCredentials,
} from "@/lib/auth-types";
import { useSettingsStore } from "@/stores/settings-store";

export function useAuth() {
  const { providers } = useSettingsStore();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [anthropicAvailability, setAnthropicAvailability] =
    useState<AuthSourceAvailability | null>(null);
  const [openaiAvailability, setOpenaiAvailability] =
    useState<AuthSourceAvailability | null>(null);

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await invoke<AuthStatus>("auth_get_status", {
        manualAnthropicKey: providers.anthropic.apiKey || null,
        manualOpenaiKey: providers.openai.apiKey || null,
      });
      setAuthStatus(status);

      // Check availability for each provider
      const [anthroAvail, openaiAvail] = await Promise.all([
        invoke<AuthSourceAvailability>("auth_check_source_availability", {
          provider: "anthropic",
          manualKey: providers.anthropic.apiKey || null,
        }),
        invoke<AuthSourceAvailability>("auth_check_source_availability", {
          provider: "openai",
          manualKey: providers.openai.apiKey || null,
        }),
      ]);
      setAnthropicAvailability(anthroAvail);
      setOpenaiAvailability(openaiAvail);
    } catch (error) {
      console.error("Failed to check auth status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [providers.anthropic.apiKey, providers.openai.apiKey]);

  const resolveAnthropicCredentials =
    useCallback(async (): Promise<ResolvedCredentials | null> => {
      try {
        const pref = providers.anthropic.preferredAuthSource || "auto";
        const result = await invoke<ResolvedCredentials | null>(
          "auth_resolve_with_preference",
          {
            provider: "anthropic",
            preferredSource: pref,
            manualKey: providers.anthropic.apiKey || null,
          },
        );
        return result;
      } catch (error) {
        console.error("Failed to resolve Anthropic credentials:", error);
        return null;
      }
    }, [providers.anthropic.apiKey, providers.anthropic.preferredAuthSource]);

  const resolveOpenAICredentials =
    useCallback(async (): Promise<ResolvedCredentials | null> => {
      try {
        const pref = providers.openai.preferredAuthSource || "auto";
        const result = await invoke<ResolvedCredentials | null>(
          "auth_resolve_with_preference",
          {
            provider: "openai",
            preferredSource: pref,
            manualKey: providers.openai.apiKey || null,
          },
        );
        return result;
      } catch (error) {
        console.error("Failed to resolve OpenAI credentials:", error);
        return null;
      }
    }, [providers.openai.apiKey, providers.openai.preferredAuthSource]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    authStatus,
    isLoading,
    anthropicAvailability,
    openaiAvailability,
    checkAuthStatus,
    resolveAnthropicCredentials,
    resolveOpenAICredentials,
  };
}
