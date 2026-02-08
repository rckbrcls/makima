// ============================================================================
// CLI Resume Utilities
// Pure functions for detecting and building resume arguments for AI CLIs
// ============================================================================

interface CliResumeConfig {
  key: string
  pattern: RegExp
  buildArgs: (id: string) => Array<string>
}

// Patterns scan the cleaned terminal output for resume instructions.
// Each pattern captures the session ID (group 1) as a non-whitespace token.
const CLI_RESUME_CONFIGS: Array<CliResumeConfig> = [
  {
    key: 'claude',
    pattern: /claude\s+(?:--resume|-r)\s+(\S+)/i,
    buildArgs: (id) => ['--resume', id],
  },
  {
    key: 'codex',
    pattern: /codex\s+resume\s+(\S+)/i,
    buildArgs: (id) => ['resume', id],
  },
  {
    key: 'gemini',
    pattern: /gemini\s+(?:--resume|-r)\s+(\S+)/i,
    buildArgs: (id) => ['--resume', id],
  },
]

/**
 * Resolve a CLI command (which may be a full path like /usr/local/bin/claude)
 * to a known config key.
 */
function resolveCliConfig(cliCommand: string): CliResumeConfig | undefined {
  const basename = cliCommand.split('/').pop()?.toLowerCase() ?? ''
  return CLI_RESUME_CONFIGS.find((c) => basename.includes(c.key))
}

/**
 * Strip ANSI escape sequences from terminal output.
 * Handles CSI sequences (colors, cursor), OSC sequences (title),
 * and other common escape patterns.
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b[[(][0-9;?]*[a-zA-Z~]|\x1b\].*?(?:\x07|\x1b\\)|\x1b[()][A-Z0-9]|\x1b[=>]/g, '')
}

/**
 * Scan cleaned terminal output for a CLI resume session ID.
 * Tries ALL known CLI patterns regardless of the command path,
 * since the output contains the CLI name (e.g. "claude --resume <id>").
 * Returns the session ID if found, null otherwise.
 */
export function extractResumeId(cleanText: string): string | null {
  for (const config of CLI_RESUME_CONFIGS) {
    const match = cleanText.match(config.pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

/**
 * Build resume args array for a CLI command.
 * Resolves full paths (e.g. /usr/local/bin/claude) to known CLI configs.
 * Returns undefined if no resumeId or unknown CLI.
 */
export function buildResumeArgs(
  cliCommand: string,
  resumeId?: string,
): Array<string> | undefined {
  if (!resumeId) return undefined

  const config = resolveCliConfig(cliCommand)
  if (!config) return undefined

  return config.buildArgs(resumeId)
}
