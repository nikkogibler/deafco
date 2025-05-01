
'use client'

import { useEffect, useState } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import Image from 'next/image'
import { useRouter } from 'next/router'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [nowPlaying, setNowPlaying] = useState<any | null>(null)
  const [devices, setDevices] = useState<any[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const supabase = createPagesBrowserClient()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        console.log('❌ No session found, redirecting to login...')
        router.push('/login')
        return
      }

      const user = session.user
      console.log('✅ Authenticated session for:', user.email)

      // Ensure user row exists
      const { error: insertError } = await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        role: 'freemium',
      })

      if (insertError) {
        console.error('❌ Failed to upsert user row:', insertError.message)
      } else {
        console.log('✅ Upserted user row successfully')
      }

      setUserEmail(user.email)

      // Comprehensive token retrieval and logging
      const userMetadata = user.user_metadata || {}
      const spotifyTokens = userMetadata.spotify_tokens

      console.log('🔍 Full User Metadata:', {
        metadata: userMetadata,
        keys: Object.keys(userMetadata)
      })

      // Detailed token logging with comprehensive checks
      const tokenLog = {
        hasUserMetadata: !!userMetadata,
        hasSpotifyTokens: !!spotifyTokens,
        accessTokenPresent: !!spotifyTokens?.access_token,
        refreshTokenPresent: !!spotifyTokens?.refresh_token,
        tokenExpiresAt: spotifyTokens?.expires_at
      }
      console.log('🔑 Token Retrieval:', tokenLog)

      // Determine if Spotify connection is needed
      const needSpotifyConnection = (
        !userMetadata || 
        !spotifyTokens || 
        !spotifyTokens.access_token
      )

      if (needSpotifyConnection) {
        console.warn('⚠️ Spotify connection required', {
          missingMetadata: !userMetadata,
          missingTokens: !spotifyTokens,
          missingAccessToken: !spotifyTokens?.access_token
        })
        
        setAccessToken(null)
        setLoading(false)
        return
      }

      // Validate token structure
      if (!spotifyTokens.access_token || !spotifyTokens.expires_at) {
        console.error('❌ Invalid token structure', spotifyTokens)
        setAccessToken(null)
        setLoading(false)
        return
      }

      // Detailed token expiration logging
      const currentTime = Date.now()
      const expirationTime = spotifyTokens.expires_at
      console.log('⏱ Token Timing:', {
        currentTime,
        expirationTime,
        timeRemaining: expirationTime - currentTime
      })

      // Check if token is expired
      const isTokenExpired = currentTime > expirationTime

      let accessToken = spotifyTokens.access_token

      // Refresh token if expired
      if (isTokenExpired && spotifyTokens.refresh_token) {
        try {
          const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic ' + Buffer.from(`${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: spotifyTokens.refresh_token
            })
          })

          const refreshedTokens = await refreshResponse.json()

          if (refreshedTokens.access_token) {
            // Update user metadata with new tokens
            const { error } = await supabase.auth.updateUser({
              data: {
                spotify_tokens: {
                  ...spotifyTokens,
                  access_token: refreshedTokens.access_token,
                  expires_at: Date.now() + (refreshedTokens.expires_in * 1000)
                }
              }
            })

            if (error) {
              console.error('❌ Failed to update Spotify tokens:', error)
            } else {
              accessToken = refreshedTokens.access_token
              console.log('✅ Spotify tokens refreshed successfully')
            }
          }
        } catch (error) {
          console.error('❌ Token refresh failed:', error)
        }
      }

      setAccessToken(accessToken)

      // Fetch Spotify data
      try {
        const userProfileResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (userProfileResponse.ok) {
          await fetchNowPlaying(accessToken)
          await fetchDevices(accessToken)
        } else {
          console.warn('⚠️ Failed to fetch Spotify user profile')
        }
      } catch (error) {
        console.error('❌ Failed to fetch Spotify data:', error)
      }

      setLoading(false)
    }

    checkSession()
  }, [router])

  const fetchNowPlaying = async (token: string) => {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.ok && res.status !== 204) {
      const data = await res.json()
      setNowPlaying(data)
    } else {
      setNowPlaying(null)
    }
  }

  const fetchDevices = async (token: string) => {
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    setDevices(data.devices || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = ''
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading your vibe...
      </div>
    )
  }

  // If user is authenticated but Spotify is not connected
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col justify-center items-center p-4">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4 text-green-400">Spotify Connection</h1>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-2">Hi {userEmail},</p>
            <p className="text-gray-300">To unlock the full DeafCo experience, connect your Spotify account.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105"
            >
              Connect Spotify
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105"
            >
              Logout
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>Connecting Spotify allows you to:</p>
            <ul className="list-disc list-inside text-left">
              <li>View your current playback</li>
              <li>See available devices</li>
              <li>Control your Spotify experience</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Full dashboard view when Spotify is connected
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center space-x-4">
            {userEmail && <p>Welcome, {userEmail}</p>}
            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>

        {nowPlaying ? (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
            <div className="flex items-center">
              {nowPlaying.item?.album?.images?.[0]?.url && (
                <Image
                  src={nowPlaying.item.album.images[0].url}
                  alt="Album Cover"
                  width={100}
                  height={100}
                  className="mr-4 rounded"
                />
              )}
              <div>
                <p className="text-xl font-bold">{nowPlaying.item?.name}</p>
                <p className="text-gray-400">
                  {nowPlaying.item?.artists
                    ?.map((artist: any) => artist.name)
                    .join(', ')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p>No track currently playing</p>
        )}

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Available Devices</h2>
          {devices.length > 0 ? (
            <ul className="space-y-2">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className="bg-gray-700 p-3 rounded flex justify-between items-center"
                >
                  <span>{device.name}</span>
                  <span className="text-sm text-gray-400">{device.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No devices available</p>
          )}
        </div>
      </div>
    </div>
  )
}
