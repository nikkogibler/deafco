'use client'

import { useEffect, useState } from 'react'
import supabase from '@/utils/supabaseClient'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [nowPlaying, setNowPlaying] = useState<any | null>(null)
  const [devices, setDevices] = useState<any[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      console.log('🧠 Session:', data)
      console.log('⚠️ Error:', error)

      if (!data?.session?.user) {
        console.warn('🚪 No user session — logging out')
        window.location.href = '/login'
        return
      }

      const user = data.session.user
      setUserEmail(user.email)

      const { data: userData } = await supabase
        .from('users')
        .select('spotify_access_token, spotify_refresh_token')
        .eq('id', user.id)
        .single()

      const token = userData?.spotify_access_token
      const refreshToken = userData?.spotify_refresh_token
      setAccessToken(token)

      if (!token) {
        console.warn('❌ No Spotify token found')
        setLoading(false)
        return
      }

      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 401 && refreshToken) {
        console.log('🔁 Token expired, refreshing...')

        const refreshed = await fetch('/api/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).then(r => r.json())

        console.log('🆕 Refreshed token response:', refreshed)

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
  }, [])

  const fetchNowPlaying = async (token: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log('🎧 Now Playing status:', res.status)

      if (res.ok && res.status !== 204) {
        const data = await res.json()
        console.log('📦 Now Playing data:', data)
        setNowPlaying(data)
      } else {
        setNowPlaying(null)
      }
    } catch (err) {
      console.error('💥 fetchNowPlaying error:', err)
    }
  }

  const fetchDevices = async (token: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      console.log('📱 Devices:', data)
      setDevices(data.devices || [])
    } catch (err) {
      console.error('💥 fetchDevices error:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = ''
    window.location.href = '/login'
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading your vibe...</div>
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
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
        <div className="mb-10">
          <h2 className="text-xl font-semibold">Now Playing:</h2>
          <p className="mt-2 font-medium">{nowPlaying.item.name}</p>
          <p className="text-sm text-gray-600">{nowPlaying.item.artists?.[0]?.name}</p>
          <img
            src={nowPlaying.item.album?.images?.[0]?.url}
            alt="Album Cover"
            className="w-48 h-48 mt-4 rounded-lg shadow-lg"
          />
        </div>
      ) : (
        <p className="text-gray-500 mb-6">No track currently playing.</p>
      )}

      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">Available Devices:</h2>
        {devices.length === 0 ? (
          <p className="text-gray-500">No active Spotify devices found.</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((device) => (
              <li key={device.id} className="flex justify-between items-center border p-2 rounded-md">
                <span>{device.name} {device.is_active && '✅'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
