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
      const refreshToken = hashParams.get('refresh_token')
      const expiresIn = hashParams.get('expires_in')

      if (accessToken) {
        console.log('Captured Spotify tokens. Saving...')

        // Try to get Supabase session user info (if available)
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          console.error('Error fetching Supabase user:', userError.message)
        }

        if (user) {
          console.log('Supabase user exists. Saving Spotify tokens.')

          const { error } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              spotify_access_token: accessToken,
              spotify_refresh_token: refreshToken,
              token_expires_at: Math.floor(Date.now() / 1000) + Number(expiresIn),
            }, { onConflict: 'id' })

          if (error) {
            console.error('Error saving Spotify tokens to Supabase:', error.message)
            alert('Problem saving your Spotify login. Please try again.')
            return
          }

          router.push('/dashboard')
        } else {
          console.warn('No Supabase user session. Proceeding anyway.')
          // You might choose to push to dashboard or reinitiate supabase.auth.refreshSession()
          router.push('/dashboard')
        }
      } else {
        console.log('No access token. Redirecting to Spotify login.')
        const clientId = 'f2a8dfe8bd764c32a3b2f71b1d271ed9'
        const redirectUri = encodeURIComponent('https://deafco.vercel.app/login')
const scopes = encodeURIComponent('user-read-email user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state')

const spotifyLoginUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}`

window.location.href = spotifyLoginUrl
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
