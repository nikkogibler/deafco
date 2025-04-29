import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function Login() {
  const router = useRouter()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const handleAuthFlow = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || null // Optional — Spotify might not send refresh token here
      const expiresIn = hashParams.get('expires_in') || 3600

      if (accessToken) {
        console.log('Access token found. Saving to Supabase...')
        
        // Optional: get Supabase user if session exists
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          await supabase
            .from('users')
            .upsert({
              id: user.id,
              spotify_access_token: accessToken,
              spotify_refresh_token: refreshToken,
              token_expires_at: Math.floor(Date.now() / 1000) + Number(expiresIn),
            }, { onConflict: 'id' })
        } else {
          console.warn('No Supabase user session. Proceeding without saving to users table.')
        }

        // Clear the hash from URL after processing
        window.history.replaceState({}, document.title, window.location.pathname)

        // Go to dashboard
        router.push('/dashboard')
      } else {
        console.log('No access token. Redirecting to Spotify login.')

        const clientId = '08191919b758419d94e2c4fc4cb44360'
        const redirectUri = encodeURIComponent('https://deafco.vercel.app/login')
        const scopes = encodeURIComponent('user-read-email user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state')

        window.location.href = `https://accounts.spotify.com/authorize?client_id=08191919b758419d94e2c4fc4cb44360&response_type=token&redirect_uri=https%3A%2F%2Fdeafco.vercel.app%2Flogin
&scope=user-read-email%20user-read-private%20user-read-playback-state%20user-read-currently-playing%20user-modify-playback-state
`
      }
    }

    handleAuthFlow()
  }, [supabase, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold">Loading your vibe...</h1>
    </div>
  )
}
