
'use client'

import { useState, useEffect } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/router'

export default function Login() {
  const supabase = createPagesBrowserClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // If user is already logged in, redirect to dashboard
        console.log(' Existing session found, redirecting to dashboard')
        router.push('/dashboard')
      } else {
        // No active session, allow login
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  const handleSpotifyLogin = async () => {
    setIsLoading(true)
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
            'user-top-read',
            'streaming',
            'user-library-read'
          ].join(' '),
          redirectTo: window.location.origin + '/callback',
          queryParams: {
            // Explicitly request offline access to get refresh token
            prompt: 'consent'
          }
        },
      })

      if (error) {
        console.error('❌ Login error:', error)
        alert(`Error: ${error.message}`)
        setIsLoading(false)
      }
    } catch (err) {
      console.error('❌ Unexpected login error:', err)
      alert('An unexpected error occurred during login')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl text-center">
        <h1 className="text-3xl font-bold text-white mb-6">DeafCo Login</h1>
        <button
          onClick={handleSpotifyLogin}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105"
        >
          Login with Spotify
        </button>
      </div>
    </div>
  )
}
