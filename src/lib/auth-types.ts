export type AuthSource = "environment" | "manual" | "none";

// Preference types for explicit source selection
export type AuthSourcePreference =
  | "auto" // Use automatic priority (default)
  | "environment" // Force environment variable
  | "manual"; // Force manual API key

export interface ProviderAuthStatus {
  is_configured: boolean;
  source: AuthSource;
  masked_key?: string;
}

export interface AuthStatus {
  anthropic: ProviderAuthStatus;
  openai: ProviderAuthStatus;
}

export interface ResolvedCredentials {
  api_key: string;
  source: AuthSource;
}

export interface AuthSourceAvailability {
  environment: boolean;
  manual: boolean;
}

export function getAuthSourceLabel(source: AuthSource): string {
  switch (source) {
    case "environment":
      return "Environment variable";
    case "manual":
      return "API Key";
    case "none":
      return "Not configured";
  }
}

export function getAuthSourceDescription(source: AuthSource): string {
  switch (source) {
    case "environment":
      return "Using ANTHROPIC_API_KEY or OPENAI_API_KEY from environment";
    case "manual":
      return "Using manually entered API key";
    case "none":
      return "No credentials configured";
  }
}

export function getPreferenceLabel(preference: AuthSourcePreference): string {
  switch (preference) {
    case "auto":
      return "Auto-detect";
    case "environment":
      return "Environment Variable";
    case "manual":
      return "Manual API Key";
  }
}

export function getPreferenceDescription(
  preference: AuthSourcePreference,
  provider: "openai" | "anthropic",
): string {
  switch (preference) {
    case "auto":
      return "Uses: Environment → Manual";
    case "environment":
      return provider === "anthropic"
        ? "Use ANTHROPIC_API_KEY from environment"
        : "Use OPENAI_API_KEY from environment";
    case "manual":
      return "Use manually entered API key";
  }
}
