import { createClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

// Define the shape of the request body
interface SpotifyTokenRequestBody {
  code?: string
  userId?: string
  user_id?: string
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  // Validate request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Log full request body for debugging
  console.log('Incoming Request Body:', {
    body: req.body,
    bodyType: typeof req.body,
    bodyKeys: Object.keys(req.body || {})
  })

  // Extract code and userId, prioritizing snake_case
  const { code, user_id, userId } = req.body as SpotifyTokenRequestBody || {}
  const resolvedUserId = user_id || userId

  // Validate inputs with more detailed logging
  if (!code) {
    console.error('❌ Missing authorization code', {
      providedBody: req.body,
      codeValue: code,
      bodyKeys: Object.keys(req.body || {})
    })
    return res.status(400).json({ 
      error: 'Missing authorization code',
      details: {
        providedBody: req.body,
        bodyKeys: Object.keys(req.body || {})
      }
    })
  }

  if (!resolvedUserId) {
    console.error('❌ Missing user ID', {
      providedBody: req.body,
      userIdValue: resolvedUserId,
      bodyKeys: Object.keys(req.body || {})
    })
    return res.status(400).json({ 
      error: 'Missing user ID',
      details: {
        providedBody: req.body,
        bodyKeys: Object.keys(req.body || {})
      }
    })
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Define possible redirect URIs
  const possibleRedirectUris = [
    'https://deafco.vercel.app/dashboard',
    'https://mnrupunmtyrlztkziqhm.supabase.co/auth/v1/callback'
  ]

  // Validate environment variables
  if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Critical Environment Variables', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey
    })
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: {
        missingVariables: {
          clientId: !clientId,
          clientSecret: !clientSecret,
          supabaseUrl: !supabaseUrl,
          supabaseServiceKey: !supabaseServiceKey
        }
      }
    })
  }

  // Log all possible redirect URIs for debugging
  console.log('🌐 Possible Redirect URIs', {
    configuredUris: possibleRedirectUris
  })

  try {
    // Comprehensive logging of all relevant environment and request details
    console.log('🔐 Spotify Token Exchange Diagnostic Info', {
      // Environment Variables
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0,
      supabaseUrlPresent: !!supabaseUrl,
      
      // Request Details
      redirectUri,
      codeLength: code.length,
      codeFirstChars: code.slice(0, 10) + '...',
      
      // Vercel-specific context
      vercelUrl: process.env.VERCEL_URL,
      nodeEnv: process.env.NODE_ENV,
      deploymentUrl: process.env.DEPLOYMENT_URL
    })

    // Dynamically determine the correct redirect URI
    const effectiveRedirectUri = possibleRedirectUris[0] // Default to first URI

    console.log('🌐 Redirect URI Details', {
      possibleUris: possibleRedirectUris,
      effectiveUri: effectiveRedirectUri
    })

    // Spotify token exchange with enhanced error handling
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: effectiveRedirectUri,
      }),
    })

    // Capture raw response text for more detailed logging
    const responseText = await response.text()
    let tokenData;
    try {
      tokenData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Failed to parse Spotify response', {
        rawResponse: responseText,
        parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      })
      return res.status(500).json({
        error: 'Failed to parse Spotify response',
        details: { rawResponse: responseText }
      })
    }

    // Detailed logging for token exchange response
    console.log('🎵 Spotify Token Exchange Response', {
      status: response.status,
      ok: response.ok,
      responseBody: JSON.stringify(tokenData).slice(0, 500), // Limit log size
      errorDetails: tokenData.error ? {
        error: tokenData.error,
        description: tokenData.error_description
      } : null
    })

    // Validate token response
    if (!response.ok) {
      console.error('❌ Spotify Token Exchange Failed', {
        status: response.status,
        errorType: tokenData.error,
        errorDescription: tokenData.error_description,
        fullResponseText: responseText
      })
      return res.status(response.status).json({
        error: tokenData.error || 'Token exchange failed',
        details: {
          description: tokenData.error_description,
          status: response.status,
          fullResponse: responseText
        }
      })
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update user with Spotify tokens
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        spotify_access_token: tokenData.access_token,
        spotify_refresh_token: tokenData.refresh_token,
        spotify_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update user tokens', updateError)
      return res.status(500).json({ 
        error: 'Failed to save tokens', 
        details: updateError.message 
      })
    }

    // Return successful response
    return res.status(200).json(tokenData)

  } catch (error) {
    console.error('Unexpected error in token exchange', error)
    return res.status(500).json({ 
      error: 'Token exchange failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
