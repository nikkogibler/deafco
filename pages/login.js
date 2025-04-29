import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()

  const handleSpotifyLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
    const redirectUri = encodeURIComponent('https://deafco.vercel.app/api/spotify/callback')
    const scopes = encodeURIComponent('user-read-email user-read-private')

    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`

    window.location.href = authUrl
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <button
        onClick={handleSpotifyLogin}
        className="bg-green-500 px-6 py-3 rounded-lg text-lg font-semibold"
      >
        Login with Spotify
      </button>
    </div>
  )
}
