

'use client'

import { useState } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export default function Login() {
  const [supabase] = useState(() => createPagesBrowserClient())

  const handleSpotifyLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes: [
          'user-read-email',
          'user-read-private',
          'user-read-playback-state',
          'user-read-currently-playing',
          'user-modify-playback-state',
        ].join(' '),
        redirectTo: 'https://deafco.vercel.app/dashboard',
        queryParams: {
          response_type: 'code',        // ⬅️ CRITICAL for your manual token flow
          show_dialog: 'true',          // ⬅️ Optional: forces Spotify login prompt
        },
      },
    })

    if (error) {
      console.error('❌ Spotify login failed:', error.message)
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
