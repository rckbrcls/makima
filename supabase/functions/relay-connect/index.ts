import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
  let code = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (const byte of array) {
    code += chars[byte % chars.length]
  }
  return code
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

    const body = await req.json().catch(() => ({}))
    const desktopName = body.desktopName || null

    // Invalidate any existing waiting sessions for this user
    await supabase
      .from('relay_sessions')
      .update({ status: 'disconnected' })
      .eq('user_id', user.id)
      .eq('status', 'waiting_pair')

    // Generate unique pairing code (retry on collision)
    let pairingCode = ''
    let attempts = 0
    while (attempts < 5) {
      pairingCode = generatePairingCode()
      const { error: insertError, data } = await supabase
        .from('relay_sessions')
        .insert({
          user_id: user.id,
          pairing_code: pairingCode,
          desktop_name: desktopName,
          status: 'waiting_pair',
        })
        .select('id, pairing_code, expires_at')
        .single()

      if (!insertError && data) {
        return new Response(
          JSON.stringify({
            sessionId: data.id,
            pairingCode: data.pairing_code,
            expiresAt: data.expires_at,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Unique constraint violation on pairing_code — retry
      if (insertError?.code === '23505') {
        attempts++
        continue
      }

      throw insertError
    }

    return new Response(
      JSON.stringify({ error: 'Failed to generate unique pairing code' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
