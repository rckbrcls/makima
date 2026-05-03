# Troubleshooting

## Provider key is missing

Symptoms:

- Chat/provider setup reports that OpenAI or Anthropic is unavailable.

Checks:

- Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.
- Confirm whether the key should come from environment or in-app settings.
- Avoid logging provider keys.

## Supabase relay fails

Checks:

- Confirm `SUPABASE_URL`.
- Confirm `SUPABASE_ANON_KEY`.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` only in trusted edge/server contexts.
- Review edge functions under `supabase/functions/`.

## Desktop command execution is not available

Checks:

- Confirm the desktop app owns the local execution flow.
- Confirm mobile/relay actions do not bypass approval.
- Inspect Tauri command boundaries before adding new privileged behavior.

## Mobile pairing is stale

Checks:

- Confirm pairing/session expiry rules.
- Confirm relay session state in Supabase.
- Revoke or recreate pairing when the desktop session changes.
