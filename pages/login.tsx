import React, { useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'

export default function Login() {
  const supabase = useSupabaseClient()
  const router = useRouter()

  useEffect(() => {
    const session = supabase.auth.session()
    
    if (session) {
      // Redirect the user to /dashboard if they are already logged in
      router.push('/dashboard')
    }
  }, [supabase, router])

  const handleSpotifyLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes:
          'user-read-email user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state',
        redirectTo: 'https://deafco.vercel.app/dashboard', // Ensure it's this exact URL
      },
    })

    if (error) {
      console.error('❌ Supabase login error:', error.message)
    } else {
      console.log('🔗 Redirecting to Spotify login...')
    }
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
