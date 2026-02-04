export type AuthSource =
  | 'environment'
  | 'claude_code_keychain'
  | 'manual'
  | 'none'

// Preference types for explicit source selection
export type AuthSourcePreference =
  | 'auto'        // Use automatic priority (default)
  | 'environment' // Force environment variable
  | 'manual'      // Force manual API key

export type AnthropicAuthSourcePreference =
  | AuthSourcePreference
  | 'claude_code_keychain' // Force Claude Code keychain (Anthropic only)

export interface ProviderAuthStatus {
  is_configured: boolean
  source: AuthSource
  masked_key?: string
}

export interface AuthStatus {
  anthropic: ProviderAuthStatus
  openai: ProviderAuthStatus
}

export interface ResolvedCredentials {
  api_key: string
  source: AuthSource
}

export function getAuthSourceLabel(source: AuthSource): string {
  switch (source) {
    case 'environment':
      return 'Environment variable'
    case 'claude_code_keychain':
      return 'Claude Code (Keychain)'
    case 'manual':
      return 'API Key'
    case 'none':
      return 'Not configured'
  }
}

export function getAuthSourceDescription(source: AuthSource): string {
  switch (source) {
    case 'environment':
      return 'Using ANTHROPIC_API_KEY or OPENAI_API_KEY from environment'
    case 'claude_code_keychain':
      return 'Using credentials from Claude Code CLI'
    case 'manual':
      return 'Using manually entered API key'
    case 'none':
      return 'No credentials configured'
  }
}

export function getPreferenceLabel(preference: AnthropicAuthSourcePreference): string {
  switch (preference) {
    case 'auto':
      return 'Auto-detect'
    case 'environment':
      return 'Environment Variable'
    case 'claude_code_keychain':
      return 'Claude Code'
    case 'manual':
      return 'Manual API Key'
  }
}

export function getPreferenceDescription(
  preference: AnthropicAuthSourcePreference,
  provider: 'openai' | 'anthropic'
): string {
  switch (preference) {
    case 'auto':
      return provider === 'anthropic'
        ? 'Uses: Environment → Claude Code → Manual'
        : 'Uses: Environment → Manual'
    case 'environment':
      return provider === 'anthropic'
        ? 'Use ANTHROPIC_API_KEY from environment'
        : 'Use OPENAI_API_KEY from environment'
    case 'claude_code_keychain':
      return 'Use credentials from Claude Code CLI'
    case 'manual':
      return 'Use manually entered API key'
  }
}
