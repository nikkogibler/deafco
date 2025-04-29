import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri = 'https://deafco.vercel.app/api/spotify/callback'

  try {
    // Step 1: Exchange code for Spotify access token
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
        redirect_uri: redirectUri,  // ✅ FIXED this line
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('No access_token returned:', tokenData)
      return res.redirect('/login?error=spotify_token_failed')
    }

    const access_token = tokenData.access_token

    // Step 2: Fetch Spotify user profile
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const profile = await userRes.json()

    if (!profile.id || !profile.email) {
      console.error('Invalid Spotify user profile:', profile)
      return res.redirect('/login?error=spotify_profile_failed')
    }

    // Step 3: Upsert into Supabase 'users' table
    const { data, error } = await supabase.from('users').upsert({
      id: profile.id,
      email: profile.email,
      spotify_access_token: access_token,
    })

    if (error) {
      console.error('Supabase upsert failed:', error)
      return res.redirect('/login?error=upsert_failed')
    }

    // ✅ Step 4: Redirect to dashboard
    res.redirect('/dashboard')
  } catch (err) {
    console.error('OAuth callback failed:', err)
    res.redirect('/login?error=server_error')
  }
}
