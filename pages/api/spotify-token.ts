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
  const redirectUri = 'https://deafco.vercel.app/dashboard'

  // Validate environment variables
  if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    // Spotify token exchange
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

    const tokenData = await response.json()

    // Validate token response
    if (!response.ok) {
      return res.status(response.status).json(tokenData)
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
