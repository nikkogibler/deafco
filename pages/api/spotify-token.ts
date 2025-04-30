// /pages/api/spotify-token.ts

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = 'https://deafco.vercel.app/dashboard'

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
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

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Spotify token exchange failed:', data)
      return res.status(400).json({ error: 'Token exchange failed', details: data })
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('❌ Unexpected error during token exchange:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
