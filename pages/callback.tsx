'use client'

import { useEffect } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/router'

export default function SpotifyCallback() {
  const supabase = createPagesBrowserClient()
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Verify the session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          console.log('\ud83d\udd11 Spotify authentication successful')
          
          // Attempt to fetch Spotify tokens
          const spotifyTokens = session.user.user_metadata.spotify_tokens

          if (spotifyTokens) {
            console.log('\ud83c\udf10 Spotify tokens found in metadata')
            router.push('/dashboard')
          } else {
            console.warn('\u26a0\ufe0f No Spotify tokens found')
            // You might want to trigger a re-authentication or show an error
            router.push('/login')
          }
        } else {
          console.warn('\u26a0\ufe0f No session found after callback')
          router.push('/login')
        }
      } catch (error) {
        console.error('\u274c Callback processing error:', error)
        router.push('/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="text-center">
        <h1 className="text-2xl">Processing Spotify Authentication...</h1>
        <p className="mt-4 text-gray-300">Please wait while we verify your credentials</p>
      </div>
    </div>
  )
}
