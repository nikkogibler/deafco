
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

      // Comprehensive token retrieval
      const spotifyTokens = user.user_metadata.spotify_tokens

      console.log('🔍 User Metadata Full:', user.user_metadata)

      // Detailed token logging
      console.log('🔑 Token Retrieval:', {
        hasUserMetadata: !!user.user_metadata,
        hasSpotifyTokens: !!spotifyTokens,
        accessTokenPresent: !!spotifyTokens?.access_token,
        refreshTokenPresent: !!spotifyTokens?.refresh_token
      })

      if (!spotifyTokens || !spotifyTokens.access_token) {
        console.warn('⚠️ No valid Spotify tokens found')
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col justify-center items-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Connect Your Spotify</h1>
          <p className="mb-6 text-gray-300">To use DeafCo, please connect your Spotify account</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition duration-300"
          >
            Connect Spotify
          </button>
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
