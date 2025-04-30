


export default async function handler(req, res) {
  const { code } = req.body

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = 'https://deafco.vercel.app/dashboard'

  console.log('🎯 Code:', code)
console.log('🔐 Client ID exists:', !!clientId)
console.log('🔐 Client Secret exists:', !!clientSecret)
console.log('↩️ Redirect URI:', redirectUri)

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
