import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code, user_id } = req.body

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const redirectUri = 'https://deafco.vercel.app/dashboard'

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

  const data = await response.json()
  return res.status(response.ok ? 200 : 400).json(data)
}
