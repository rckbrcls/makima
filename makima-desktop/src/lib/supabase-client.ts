import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

export function getSupabaseClient(
  url: string,
  anonKey: string,
): SupabaseClient {
  if (client) return client

  client = createClient(url, anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 40,
      },
    },
  })

  return client
}

export function destroySupabaseClient() {
  if (client) {
    client.realtime.disconnect()
    client = null
  }
}

export function getExistingClient(): SupabaseClient | null {
  return client
}
