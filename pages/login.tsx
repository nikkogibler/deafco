'use client'

export default function Login() {
  const handleSpotifyLogin = () => {
    const authUrl =
      'https://accounts.spotify.com/authorize?client_id=f2a8dfe8bd764c32a3b2f71b1d271ed9&response_type=code&redirect_uri=https%3A%2F%2Fdeafco.vercel.app%2Fdashboard&scope=user-read-email%20user-read-private%20user-read-playback-state%20user-read-currently-playing%20user-modify-playback-state&show_dialog=true'

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
