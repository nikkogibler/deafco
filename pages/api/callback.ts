import { v4 as uuidv4 } from 'uuid'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

console.log('🚀 Callback hit')
console.log('ENV Vars:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  spotifyClientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri = 'https://deafco.vercel.app/api/callback'

  try {
    console.log('🎧 Step 1: Received Spotify code:', code)

    // Exchange code for access token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    console.log('🎧 Step 2: Token response:', tokenData)

    if (!tokenData.access_token) {
      console.error('❌ No access_token returned:', tokenData)
      return res.redirect('/login?error=spotify_token_failed')
    }

    const access_token = tokenData.access_token

    // Fetch Spotify user profile
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const profile = await userRes.json()
    console.log('🎧 Step 3: Spotify user profile:', profile)

    if (!profile.id || !profile.email) {
      console.error('❌ Invalid Spotify user profile:', profile)
      return res.redirect('/login?error=spotify_profile_failed')
    }

    const generatedId = uuidv4()
    console.log('🎧 Step 4: Generated UUID:', generatedId)

    // Save to Supabase
    const { error } = await supabase.from('users').upsert({
      id: generatedId,
      email: profile.email,
      name: profile.display_name || '',
      role: 'user',
      spotify_id: profile.id,
      spotify_access_token: access_token,
      spotify_refresh_token: null,
      token_expires_at: null,
    })

    if (error) {
      console.error('❌ Supabase upsert failed:', error)
      return res.redirect('/login?error=upsert_failed')
    }

    console.log('✅ Supabase upsert succeeded. Redirecting to /dashboard...')
    return res.redirect('/dashboard')

  } catch (err) {
    console.error('❌ OAuth callback error:', err)
    return res.redirect('/login?error=server_error')
  }
}
