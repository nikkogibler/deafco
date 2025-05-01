
'use client'

import { useState } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()
  const [supabase] = useState(() => createPagesBrowserClient())
  const [error, setError] = useState<string | null>(null)

  const handleSpotifyLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          scopes: [
            'user-read-email',
            'user-read-private',
            'user-read-playback-state',
            'user-read-currently-playing',
            'user-modify-playback-state',
            'user-top-read'
          ].join(' '),
          redirectTo: 'https://deafco.vercel.app/dashboard'
        },
      })

      if (error) {
        setError(`Spotify login failed: ${error.message}`)
        console.error('❌ Spotify login error:', error)
      }
    } catch (err) {
      setError(`Unexpected login error: ${err instanceof Error ? err.message : String(err)}`)
      console.error('❌ Unexpected login error:', err)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white space-y-4">
      {error && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
      <button
        onClick={handleSpotifyLogin}
        className="bg-green-500 px-6 py-3 rounded-lg text-lg font-semibold hover:bg-green-600"
      >
        Login with Spotify
      </button>
    </div>
  )
}
