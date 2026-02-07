import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json()
    const { pairingCode } = body

    if (!pairingCode || typeof pairingCode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid pairingCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Find the session by pairing code
    const { data: session, error: fetchError } = await supabase
      .from('relay_sessions')
      .select('id, user_id, desktop_name, active_agent_id, active_agent_name, active_session_key, status, expires_at')
      .eq('pairing_code', pairingCode.toUpperCase().trim())
      .eq('status', 'waiting_pair')
      .single()

    if (fetchError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired pairing code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verify same user
    if (session.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Pairing code belongs to a different account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Pairing code has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Update session to paired
    const { error: updateError } = await supabase
      .from('relay_sessions')
      .update({
        status: 'paired',
        mobile_connected_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        desktopName: session.desktop_name,
        activeAgentId: session.active_agent_id,
        activeAgentName: session.active_agent_name,
        activeSessionKey: session.active_session_key,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
