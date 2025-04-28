'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import supabase from '@/utils/supabaseClient'

export default function Dashboard() {
  const session = useSession()
  const [nowPlaying, setNowPlaying] = useState(null)
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)

  useEffect(() => {
    if (!session?.user) {
      window.location.href = '/login'
      return
    }

    const loadData = async () => {
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('spotify_access_token, spotify_refresh_token')
          .eq('id', session.user.id)
          .single()

        const token = userRow?.spotify_access_token
        const refreshToken = userRow?.spotify_refresh_token

        if (!token) {
          console.warn('No Spotify token available')
          return
        }

        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.status === 401 && refreshToken) {
          const refreshed = await fetch('/api/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).then(r => r.json())

          if (refreshed.access_token) {
            await supabase.from('users')
              .update({ spotify_access_token: refreshed.access_token })
              .eq('id', session.user.id)

            setAccessToken(refreshed.access_token)
            await fetchNowPlaying(refreshed.access_token)
            await fetchDevices(refreshed.access_token)
          }
        } else {
          setAccessToken(token)
          await fetchNowPlaying(token)
          await fetchDevices(token)
        }
      } catch (error) {
        console.error('Failed to load data', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session])

  const fetchNowPlaying = async (token) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok && res.status !== 204) {
        const data = await res.json()
        setNowPlaying(data)
      } else {
        setNowPlaying(null)
      }
    } catch (error) {
      console.error('Error fetching now playing', error)
    }
  }

  const fetchDevices = async (token) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setDevices(data.devices || [])
    } catch (error) {
      console.error('Error fetching devices', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = ''
    window.location.href = '/login'
  }

  const track = nowPlaying?.item
  const userEmail = session?.user?.email

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading your vibe...</div>
    )
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

      {track ? (
        <div className="mb-10">
          <h2 className="text-xl font-semibold">Now Playing:</h2>
          <p className="mt-2 font-medium">{track.name}</p>
          <p className="text-sm text-gray-600">{track.artists?.[0]?.name}</p>
          <img
            src={track.album?.images?.[0]?.url}
            alt="Album Cover"
            className="w-48 h-48 mt-4 rounded-lg shadow-lg"
          />
        </div>
      ) : (
        <p className="text-gray-600 mb-6">No track currently playing.</p>
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
