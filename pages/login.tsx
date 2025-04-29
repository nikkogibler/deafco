import React from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'

export default function Login() {
  const supabase = useSupabaseClient()
  const router = useRouter()

  const handleSpotifyLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes:
          'user-read-email user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state',
        redirectTo: 'https://deafco.vercel.app/dashboard', // Ensure it's this exact URL
      },
    })

    // Log the generated URL Supabase is using
    if (data) {
      console.log('🔗 Supabase generated OAuth URL:', data.url)  // This will show the exact URL
    }

    if (error) {
      console.error('❌ Supabase login error:', error.message)
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
