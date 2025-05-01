import { useEffect, useState } from 'react'
import { AppProps } from 'next/app'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider, useSessionContext } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import '@/styles/globals.css'

function AuthRedirectHandler() {
  const { supabaseClient } = useSessionContext()
  const { isLoading, session } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && session) {
      // Listen for auth state changes to capture Spotify tokens
      const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('🔍 Auth State Change Event:', { event, hasProviderToken: !!session?.provider_token })

        if (event === 'SIGNED_IN') {
          try {
            // If no provider token, attempt to get it from user metadata
            const providerToken = session.provider_token || session.user?.user_metadata?.spotify_tokens?.access_token
            const providerRefreshToken = session.provider_refresh_token || session.user?.user_metadata?.spotify_tokens?.refresh_token

            if (providerToken) {
              // Fetch Spotify user profile to validate token
              const spotifyResponse = await fetch('https://api.spotify.com/v1/me', {
                headers: { Authorization: `Bearer ${providerToken}` }
              })

              if (spotifyResponse.ok) {
                const spotifyProfile = await spotifyResponse.json()

                console.log('🌐 Spotify Profile:', {
                  id: spotifyProfile.id,
                  displayName: spotifyProfile.display_name
                })

                // Update user metadata with Spotify tokens
                const { error } = await supabaseClient.auth.updateUser({
                  data: {
                    spotify_tokens: {
                      access_token: providerToken,
                      refresh_token: providerRefreshToken,
                      expires_at: Date.now() + (3600 * 1000), // 1 hour from now
                      spotify_user_id: spotifyProfile.id
                    }
                  }
                })

                if (error) {
                  console.error('❌ Failed to save Spotify tokens:', error)
                } else {
                  console.log('✅ Spotify tokens saved successfully')
                }
              } else {
                console.warn('⚠️ Failed to fetch Spotify user profile')
              }
            } else {
              console.warn('⚠️ No Spotify tokens available')
            }
          } catch (error) {
            console.error('❌ Error processing Spotify login:', error)
          }
        }
      })

      return () => {
        authListener.subscription.unsubscribe()
      }
    }
  }, [isLoading, session, supabaseClient])

  return null
}

function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
      <AuthRedirectHandler />
      <Component {...pageProps} />
    </SessionContextProvider>
  )
}

export default MyApp
