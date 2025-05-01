import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Comprehensive logging of incoming request
  console.log('🔍 Spotify Token Exchange Request', {
    method: req.method,
    body: req.body,
    headers: req.headers,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL,
    }
  })

  // Validate request method
  if (req.method !== 'POST') {
    console.error('❌ Invalid request method', { method: req.method })
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, user_id } = req.body

  // Validate required inputs
  if (!code) {
    console.error('❌ Missing authorization code', { body: req.body })
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  // Validate environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables', { missingVars })
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: { missingVars }
    })
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  // Multiple possible redirect URIs
  const possibleRedirectUris = [
    'https://deafco.vercel.app/dashboard',
    'https://mnrupunmtyrlztkziqhm.supabase.co/auth/v1/callback'
  ]

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Log code and user_id to Supabase
    const { error: trackingError } = await supabase
      .from('spotify_code_tracking')
      .insert({
        code,
        user_id,
        created_at: new Date().toISOString()
      })

    if (trackingError) {
      console.error('❌ Failed to log authorization code', {
        error: trackingError,
        code,
        user_id
      })
    }

    // Try each possible redirect URI
    let lastError = null
    for (const redirectUri of possibleRedirectUris) {
      try {
        console.log('🔐 Attempting Spotify Token Exchange', {
          clientIdLength: clientId.length,
          redirectUri,
          codeLength: code.length
        })

        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
        })

        // Log raw response details
        console.log('🌊 Spotify Token Exchange Response', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers)
        })

        const data = await response.json()

        // Successful token exchange
        if (response.ok) {
          console.log('💰 Token Exchange Result', {
            hasAccessToken: !!data.access_token,
            hasRefreshToken: !!data.refresh_token
          })
          return res.status(200).json(data)
        }

        // Store last error for comprehensive logging
        lastError = { status: response.status, data }
      } catch (iterationError) {
        console.error('❌ Spotify Token Exchange Iteration Failed', {
          redirectUri,
          error: iterationError instanceof Error ? iterationError.message : 'Unknown error'
        })
        lastError = iterationError
      }
    }

    // If no redirect URI worked
    console.error('❌ All Redirect URI Attempts Failed', {
      lastError,
      possibleRedirectUris
    })

    return res.status(400).json({
      error: 'Token exchange failed',
      details: lastError instanceof Error ? lastError.message : lastError
    })
  } catch (error) {
    console.error('❌ Spotify Token Exchange Catastrophic Failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })

    return res.status(500).json({
      error: 'Token exchange failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
