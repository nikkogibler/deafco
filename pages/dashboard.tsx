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
      const { data: { session }, error } = await supabase.auth.getSession()

      if (!session?.user) {
        console.log('❌ No session found, redirecting to login...')
        router.push('/login')
        return
      }

      const user = session.user
      console.log('✅ Authenticated session for:', user.email)

      // 🌐 Check for ?code=... and exchange it for Spotify tokens
      if (router.query.code) {
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
        const clientSecret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET
        const redirectUri = 'https://deafco.vercel.app/dashboard'
        const code = router.query.code as string

        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
        })

        const tokenData = await tokenResponse.json()
        console.log('🎧 Spotify token response:', tokenData)

        if (tokenData.access_token && tokenData.refresh_token) {
          await supabase.from('users').update({
            spotify_access_token: tokenData.access_token,
            spotify_refresh_token: tokenData.refresh_token,
            token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
          }).eq('id', user.id)

          setAccessToken(tokenData.access_token)
          router.replace('/dashboard')
        }
      }

      // 🔁 Ensure user is inserted into `users` table
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

      // 🎧 Fetch Spotify tokens from Supabase
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('spotify_access_token, spotify_refresh_token')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        console.error('❌ Could not fetch tokens:', fetchError.message)
        setLoading(false)
        return
      }

      const token = userData?.spotify_access_token
      const refreshToken = userData?.spotify_refresh_token
      setAccessToken(token)

      if (!token) {
        console.warn('⚠️ No Spotify access token stored yet')
        setLoading(false)
        return
      }

      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401 && refreshToken) {
        console.log('🎯 Token expired, refreshing...')
        const refreshed = await fetch('/api/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).then(r => r.json())

        if (refreshed.access_token) {
          await supabase
            .from('users')
            .update({ spotify_access_token: refreshed.access_token })
            .eq('id', user.id)

          setAccessToken(refreshed.access_token)
          await fetchNowPlaying(refreshed.access_token)
          await fetchDevices(refreshed.access_token)
        }
      } else {
        await fetchNowPlaying(token)
        await fetchDevices(token)
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

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-40" style={{ backgroundColor: '#141b24', color: 'white' }}>
      <div className="absolute top-8">
        <Image src="/sonicsuite-logo.png" alt="SonicSuite Logo" width={480} height={120} />
      </div>

      <div className="absolute top-8 right-8">
        <Image src="/spotify-logo.png" alt="Spotify" width={40} height={40} />
      </div>

      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to the Dashboard</h1>

        {userEmail && (
          <>
            <p className="mb-4">Logged in as: {userEmail}</p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 mb-8 bg-black text-white rounded-xl"
            >
              Logout
            </button>
          </>
        )}

        {nowPlaying?.item ? (
          <div className="mb-10 flex flex-col items-center">
            <h2 className="text-xl font-semibold">Now Playing:</h2>
            <p className="mt-2 font-medium">{nowPlaying.item.name}</p>
            <p className="text-sm text-gray-400">{nowPlaying.item.artists?.[0]?.name}</p>
            <img
              src={nowPlaying.item.album?.images?.[0]?.url}
              alt="Album Cover"
              className="w-48 h-48 mt-4 rounded-lg shadow-lg"
            />
          </div>
        ) : (
          <p className="text-gray-400 mb-6">No track currently playing.</p>
        )}

        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">Available Devices:</h2>
          {devices.length === 0 ? (
            <p className="text-gray-400">No active Spotify devices found.</p>
          ) : (
            <ul className="space-y-2">
              {devices.map(device => (
                <li key={device.id} className="flex justify-between items-center border border-gray-700 p-2 rounded-md">
                  <span>{device.name} {device.is_active && '✅'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
