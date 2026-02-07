import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// APNs HTTP/2 endpoints
const APNS_PRODUCTION = 'https://api.push.apple.com'
const APNS_SANDBOX = 'https://api.sandbox.push.apple.com'
const BUNDLE_ID = 'polterware.makima-mobile'

interface PushPayload {
  deviceToken: string
  title: string
  body: string
  data?: Record<string, string>
}

async function createJWT(): Promise<string> {
  const teamId = Deno.env.get('APNS_TEAM_ID')
  const keyId = Deno.env.get('APNS_KEY_ID')
  const p8Key = Deno.env.get('APNS_KEY_P8')

  if (!teamId || !keyId || !p8Key) {
    throw new Error('Missing APNs configuration: APNS_TEAM_ID, APNS_KEY_ID, APNS_KEY_P8')
  }

  // Create JWT header and claims
  const header = { alg: 'ES256', kid: keyId }
  const claims = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
  }

  // Base64url encode
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const headerB64 = encode(header)
  const claimsB64 = encode(claims)
  const signingInput = `${headerB64}.${claimsB64}`

  // Import the P8 private key
  const pemContents = p8Key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const keyData = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  )

  // Convert DER signature to raw r||s format expected by Apple
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${signingInput}.${signatureB64}`
}

serve(async (req) => {
  try {
    // Verify this is called internally (service role key)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Verify service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    // Allow both service role and authenticated users
    if (error && token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const payload: PushPayload = await req.json()
    const { deviceToken, title, body, data } = payload

    if (!deviceToken || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const jwt = await createJWT()
    const useSandbox = Deno.env.get('APNS_USE_SANDBOX') === 'true'
    const apnsUrl = useSandbox ? APNS_SANDBOX : APNS_PRODUCTION

    const apnsPayload = {
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
        'mutable-content': 1,
      },
      ...data,
    }

    const response = await fetch(
      `${apnsUrl}/3/device/${deviceToken}`,
      {
        method: 'POST',
        headers: {
          'authorization': `bearer ${jwt}`,
          'apns-topic': BUNDLE_ID,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'content-type': 'application/json',
        },
        body: JSON.stringify(apnsPayload),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('APNs error:', response.status, errorBody)
      return new Response(
        JSON.stringify({ error: 'APNs delivery failed', status: response.status, details: errorBody }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
