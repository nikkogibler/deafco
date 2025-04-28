'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import supabase from '@/utils/supabaseClient'

export default function Login() {
  const router = useRouter()

  useEffect(() => {
    const signInWithSpotify = async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes:
            'user-read-email user-read-private user-read-playback-state user-read-currently-playing user-modify-playback-state',
        },
      })

      if (error) {
        console.error('Spotify login error:', error.message)
      }
    }

    signInWithSpotify()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-3xl font-bold mb-4">Redirecting to Spotify...</h1>
      <p>If nothing happens, try refreshing the page.</p>
    </div>
  )
}
