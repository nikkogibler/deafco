'use client'

export default function Login() {
  const handleSpotifyLogin = () => {
    const clientId = 'f2a8dfe8bd764c32a3b2f71b1d271ed9'
    const redirectUri = 'https://deafco.vercel.app/dashboard'
    const scopes = [
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-read-currently-playing',
      'user-modify-playback-state',
    ].join(' ')

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&show_dialog=true`

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
