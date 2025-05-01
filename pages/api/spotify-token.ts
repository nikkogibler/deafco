
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

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<SpotifyTokenResponse | { error: string }>
) {
  const { code, user_id } = req.body as TokenRequestBody

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = 'https://deafco.vercel.app/dashboard'

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Missing Spotify credentials' })
  }

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

  const tokenData = await response.json() as SpotifyTokenResponse

  if (!response.ok) {
    return res.status(400).json({ error: 'Failed to exchange token' })
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
    return res.status(500).json({ error: 'Failed to save tokens' })
  }

  return res.status(200).json(tokenData)
}
