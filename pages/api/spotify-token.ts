
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
  method?: string
  originalBody?: any
  bodyType?: string
  codeType?: string
  userIdType?: string
  parseError?: string
  missingClientId?: boolean
  missingClientSecret?: boolean
  codeLength?: number
  user_idLength?: number
  spotifyResponseStatus?: number
  spotifyResponseText?: string
  supabaseError?: string
  errorMessage?: string
  userId?: string
  originalResponse?: string
  responseText?: string
  bodyKeys?: string[]
  requestBody?: any
  errorType?: string
  errorStack?: string
  timestamp?: string
  requestDetails?: {
    method?: string
    body?: string
    headers?: string[]
  }
  runtimeContext?: {
    timestamp?: string
    nodeVersion?: string
    platform?: string
  }
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
  // Validate request method
  if (req.method !== 'POST') {
    console.error('❌ Invalid request method:', req.method)
    return res.status(405).json({
      error: 'Method Not Allowed',
      details: { method: req.method }
    })
  }

  // Log full request details for debugging
  console.log('Incoming Request Full Details:', {
    method: req.method,
    body: req.body,
    query: req.query,
    rawBody: req.body,
    headers: req.headers,
    contentType: req.headers['content-type'],
    rawHeaders: Object.keys(req.headers).reduce((acc, key) => {
      acc[key] = req.headers[key]
      return acc
    }, {} as Record<string, string | string[] | undefined>)
  })

  // Parse request body with extra safety
  let parsedBody: TokenRequestBody
  try {
    // Try multiple parsing strategies
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body)
      } catch {
        // If JSON parsing fails, try treating as already parsed
        parsedBody = JSON.parse(JSON.stringify(req.body))
      }
    } else if (typeof req.body === 'object') {
      parsedBody = req.body as TokenRequestBody
    } else {
      throw new Error('Unsupported body type')
    }

    console.log('Parsed Body:', {
      bodyType: typeof parsedBody,
      code: parsedBody.code ? 'Present' : 'Missing',
      user_id: parsedBody.user_id ? 'Present' : 'Missing'
    })
  } catch (parseError) {
    console.error('❌ Failed to parse request body', {
      originalBody: req.body,
      bodyType: typeof req.body,
      parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
    })
    return res.status(400).json({
      error: 'Invalid request body',
      details: { 
        originalBody: req.body,
        bodyType: typeof req.body,
        parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }
    })
  }

  const { code, user_id } = parsedBody

  // Validate incoming request
  if (!code) {
    console.error('❌ Missing authorization code', {
      requestBody: req.body,
      codeType: typeof code,
      bodyKeys: Object.keys(req.body || {})
    })
    return res.status(400).json({
      error: 'Missing authorization code',
      details: { 
        codeType: typeof code,
        bodyKeys: Object.keys(req.body || {})
      }
    })
  }

  if (!user_id) {
    console.error('❌ Missing user ID', {
      requestBody: req.body,
      userIdType: typeof user_id,
      bodyKeys: Object.keys(req.body || {})
    })
    return res.status(400).json({
      error: 'Missing user ID',
      details: { 
        userIdType: typeof user_id,
        bodyKeys: Object.keys(req.body || {})
      }
    })
  }

  // Additional diagnostic logging
  console.log('🕵️ Request Body Deep Inspection', {
    bodyType: typeof req.body,
    bodyKeys: Object.keys(req.body || {}),
    bodyStringified: JSON.stringify(req.body),
    headers: req.headers
  })

  // Comprehensive deployment and environment diagnostics
  console.log('🔎 Deployment Environment Diagnostics', {
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ? 'Present' : 'Missing',
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'Masked' : 'Missing',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Masked' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    DEPLOYMENT_CONTEXT: process.env.DEPLOYMENT_CONTEXT
  })

  // Validate and prepare credentials
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/dashboard` 
    : 'https://deafco.vercel.app/dashboard'

  console.log('🔐 Credential Validation', {
    clientIdLength: clientId?.length || 0,
    clientSecretMasked: clientSecret ? '*'.repeat(clientSecret.length) : 'Missing',
    resolvedRedirectUri: redirectUri,
    deploymentUrl: process.env.VERCEL_URL
  })

  // Additional runtime context logging
  console.log('💻 Runtime Context', {
    timestamp: new Date().toISOString(),
    processVersion: process.version,
    platform: process.platform
  })

  // Validate credentials before proceeding
  if (!clientId) {
    console.error('❌ Missing Spotify Client ID')
    return res.status(400).json({
      error: 'Missing Spotify credentials',
      details: { 
        missingClientId: true,
        environment: process.env
      }
    })
  }

  if (!clientSecret) {
    console.error('❌ Missing Spotify Client Secret')
    return res.status(400).json({
      error: 'Missing Spotify credentials',
      details: { 
        missingClientSecret: true,
        environment: process.env
      }
    })
  }

  // Log incoming token exchange details
  console.log('Token Exchange Attempt:', {
    code: code ? 'Present' : 'Missing',
    user_id: user_id ? 'Present' : 'Missing',
    codeLength: code?.length,
    user_idLength: user_id?.length
  })

  try {
    // Comprehensive token exchange diagnostics
    console.log('🔍 Detailed Token Exchange Attempt', {
      clientId: clientId ? 'Present' : 'Missing',
      clientSecretLength: clientSecret?.length || 0,
      code: code ? `Present (length: ${code.length})` : 'Missing',
      redirectUri,
      fullAuthHeader: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`.slice(0, 20) + '...' // Mask sensitive info
    })

    // Spotify token exchange request
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    })

    // Detailed token exchange response logging
    const responseText = await tokenResponse.text()
    console.log('🔎 Token Exchange Full Response', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      responseLength: responseText.length,
      responseText: responseText.slice(0, 500) // Limit log size
    })

    // Validate token response
    if (!tokenResponse.ok) {
      console.error('❌ Spotify Token Exchange Failed', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        responseText
      })
      return res.status(tokenResponse.status).json({
        error: 'Spotify token exchange failed',
        details: {
          spotifyResponseStatus: tokenResponse.status,
          spotifyResponseText: responseText
        }
      })
    }

    // Parse token response
    const tokenData: SpotifyTokenResponse = JSON.parse(responseText)

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
        spotify_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000)
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('❌ Failed to update user tokens', updateError)
      return res.status(500).json({
        error: 'Failed to save tokens',
        details: {
          supabaseError: updateError.message,
          userId: user_id
        }
      })
    }

    // Return successful token response
    return res.status(200).json(tokenData)

  } catch (error) {
    console.error('❌ Unexpected Token Exchange Error', error)
    return res.status(500).json({
      error: 'Unexpected error during token exchange',
      details: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        code: code ? 'Present' : 'Missing',
        user_id: user_id ? 'Present' : 'Missing'
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
    // Enhanced error logging and diagnostics
  console.error('🔥 Critical Token Exchange Error', {
    errorType: error instanceof Error ? error.constructor.name : 'Unknown',
    errorMessage: error instanceof Error ? error.message : 'Unknown error',
    errorStack: error instanceof Error ? error.stack : 'No stack trace',
    requestDetails: {
      method: req.method,
      body: req.body ? JSON.stringify(req.body).slice(0, 500) : 'No body',
      headers: Object.keys(req.headers)
    },
    runtimeContext: {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform
    }
  })

  return res.status(500).json({ 
    error: 'Token exchange failed', 
    details: {
      message: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown Error',
      timestamp: new Date().toISOString()
    }
  })
  }
}
