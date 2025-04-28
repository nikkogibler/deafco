import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'

export default function Login() {
  const router = useRouter()
  const session = useSession()
  const supabase = useSupabaseClient()

  useEffect(() => {
    const handleSpotifyCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))

      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const expiresIn = hashParams.get('expires_in')

      if (accessToken) {
        // Update the user in Supabase with Spotify tokens
        const { data, error } = await supabase
          .from('users')
          .update({
            spotify_access_token: accessToken,
            spotify_refresh_token: refreshToken,
            token_expires_at: Math.floor(Date.now() / 1000) + Number(expiresIn),
          })
          .eq('id', session.user.id)

        if (error) {
          console.error('Error updating Spotify tokens:', error.message)
          alert('There was a problem saving your Spotify login. Please try again.')
          return
        }

        // Redirect to dashboard after successful login
        router.push('/dashboard')
      }
    }

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
