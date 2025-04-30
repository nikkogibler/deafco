export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { refresh_token } = req.body

  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh_token' })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  const body = new URLSearchParams()
  body.append('grant_type', 'refresh_token')
  body.append('refresh_token', refresh_token)
  body.append('client_id', clientId)
  body.append('client_secret', clientSecret)

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Spotify refresh failed:', data)
      return res.status(400).json({ error: 'Token refresh failed', details: data })
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('❌ Unexpected refresh error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
