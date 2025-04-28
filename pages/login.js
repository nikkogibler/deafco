import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'

export default function Login() {
  const router = useRouter()
  const session = useSession()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const handleSpotifyCallback = async () => {
      // Capture hash parameters from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const expiresIn = hashParams.get('expires_in')

      // ⭐ INSERT REDIRECT HERE ⭐
      if (!accessToken && session?.user) {
        console.log('No Spotify token found. Redirecting to Spotify login...')

        const clientId = 'YOUR_SPOTIFY_CLIENT_ID' // <-- replace this
        const redirectUri = encodeURIComponent('https://your-app.vercel.app/login') // <-- replace this
        const scopes = encodeURIComponent('user-read-email user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state')

        window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`
        return // Important: stop execution after redirect
      }

      // ✅ Capture tokens if present
      if (accessToken && session?.user) {
        console.log('Captured Spotify tokens, updating Supabase...')

        const { error } = await supabase
          .from('users')
          .upsert({
            spotify_access_token: accessToken,
            spotify_refresh_token: refreshToken,
            token_expires_at: Math.floor(Date.now() / 1000) + Number(expiresIn),
          })
          .eq('id', session.user.id)

        if (error) {
          console.error('Error updating user with Spotify tokens:', error.message)
          alert('Could not save your Spotify login. Please try again.')
          return
        }

        // Tokens saved successfully → Redirect to dashboard
        router.push('/dashboard')
      }
    }

    // Only run this if session exists
    if (session) {
      handleSpotifyCallback()
    }
  }, [session, supabase, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold">Loading your vibe...</h1>
    </div>
  )
}
