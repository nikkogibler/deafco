import React from 'react'

export default function Login() {
  const handleSpotifyLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const redirectUri = 'https://deafco.vercel.app/api/callback'

    if (!clientId) {
      console.error('❌ Missing Spotify Client ID')
      return
    }

    const scopes = [
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-read-currently-playing',
      'user-modify-playback-state',
    ].join(' ')

    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
      scopes
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`

    console.log('🔗 Redirecting to Spotify OAuth:', authUrl)
    window.location.href = authUrl
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <button
        onClick={handleSpotifyLogin}
        className="bg-green-500 px-6 py-3 rounded-lg text-lg font-semibold hover:bg-green-600"
      >
        Login with Spotify
      </button>
    </div>
  )
}
