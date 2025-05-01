
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

interface TokenRequestBody {
  code: string
  user_id: string
}

interface SpotifyTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface ErrorDetails {
  clientId?: boolean
  clientSecret?: boolean
  environment?: {
    NODE_ENV?: string
    VERCEL?: string
    VERCEL_ENV?: string
  }
  responseStatus?: number
  responseBody?: any
  message?: string
  body?: any
}

interface ErrorResponse {
  error: string
  details?: ErrorDetails
}

type TokenExchangeResponse = SpotifyTokenResponse | ErrorResponse

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<TokenExchangeResponse>
) {
  // Log full request details for debugging
  console.log('Incoming Request:', {
    method: req.method,
    body: req.body,
    query: req.query,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  })

  const { code, user_id } = req.body as TokenRequestBody

  // Validate incoming request
  if (!code) {
    console.error('❌ Missing authorization code')
    return res.status(400).json({
      error: 'Missing authorization code',
      details: { body: req.body }
    })
  }

  if (!user_id) {
    console.error('❌ Missing user ID')
    return res.status(400).json({
      error: 'Missing user ID',
      details: { body: req.body }
    })
  }

  // Comprehensive environment variable logging
  console.log('Full Environment:', {
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ? 'Present' : 'Missing',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'Present' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV
  })

  // Log the actual values (masked for security)
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = 'https://deafco.vercel.app/dashboard'

  console.log('Credentials Check:', {
    clientIdLength: clientId?.length,
    clientSecretLength: clientSecret?.length
  })

  if (!clientId || !clientSecret) {
    console.error('❌ Critical: Missing Spotify credentials', {
      clientIdStatus: clientId ? 'Present' : 'Missing',
      clientSecretStatus: clientSecret ? 'Present' : 'Missing'
    })
    return res.status(500).json({ 
      error: 'Missing Spotify credentials', 
      details: {
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          VERCEL_ENV: process.env.VERCEL_ENV
        }
      }
    })
  }

  try {
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

    console.log('Spotify Token Exchange Response:', {
      status: response.status,
      statusText: response.statusText
    })

    const rawTokenData = await response.json()

    console.log('Raw Token Response:', rawTokenData)

    if (!response.ok) {
      console.error('❌ Token Exchange Failed:', {
        status: response.status,
        body: rawTokenData
      })
      return res.status(400).json({ 
        error: 'Failed to exchange token', 
        details: {
          responseStatus: response.status,
          responseBody: rawTokenData
        }
      })
    }

    // Validate token response
    const tokenData: SpotifyTokenResponse = {
      access_token: rawTokenData.access_token,
      refresh_token: rawTokenData.refresh_token,
      expires_in: rawTokenData.expires_in
    }

    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error('❌ Invalid Token Response:', tokenData)
      return res.status(400).json({ 
        error: 'Invalid token response', 
        details: {
          responseBody: rawTokenData
        }
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update user with Spotify tokens
    const { error: updateError } = await supabase
      .from('users')
      .update({
        spotify_access_token: tokenData.access_token,
        spotify_refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000)
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('❌ Failed to save Spotify tokens:', updateError)
      return res.status(500).json({ 
        error: 'Failed to save tokens', 
        details: { message: updateError.message } 
      })
    }

    return res.status(200).json(tokenData)
  } catch (error) {
    console.error('🔥 Critical Token Exchange Error:', error)
    return res.status(500).json({ 
      error: 'Token exchange failed', 
      details: {
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}
