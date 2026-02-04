import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useState } from 'react'
import type { AuthStatus, ResolvedCredentials } from '@/lib/auth-types'
import { useSettingsStore } from '@/stores/settings-store'

export function useAuth() {
  const { providers } = useSettingsStore()
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasClaudeCode, setHasClaudeCode] = useState(false)

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const status = await invoke<AuthStatus>('auth_get_status', {
        manualAnthropicKey: providers.anthropic.apiKey || null,
        manualOpenaiKey: providers.openai.apiKey || null,
      })
      setAuthStatus(status)

      const claudeCodeExists = await invoke<boolean>('auth_check_claude_code')
      setHasClaudeCode(claudeCodeExists)
    } catch (error) {
      console.error('Failed to check auth status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [providers.anthropic.apiKey, providers.openai.apiKey])

  const resolveAnthropicCredentials = useCallback(async (): Promise<ResolvedCredentials | null> => {
    try {
      const result = await invoke<ResolvedCredentials | null>('auth_resolve_anthropic', {
        manualKey: providers.anthropic.apiKey || null,
      })
      return result
    } catch (error) {
      console.error('Failed to resolve Anthropic credentials:', error)
      return null
    }
  }, [providers.anthropic.apiKey])

  const resolveOpenAICredentials = useCallback(async (): Promise<ResolvedCredentials | null> => {
    try {
      const result = await invoke<ResolvedCredentials | null>('auth_resolve_openai', {
        manualKey: providers.openai.apiKey || null,
      })
      return result
    } catch (error) {
      console.error('Failed to resolve OpenAI credentials:', error)
      return null
    }
  }, [providers.openai.apiKey])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  return {
    authStatus,
    isLoading,
    hasClaudeCode,
    checkAuthStatus,
    resolveAnthropicCredentials,
    resolveOpenAICredentials,
  }
}
