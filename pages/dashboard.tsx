import { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowPlaying, setNowPlaying] = useState<any | null>(null);
  const [devices, setDevices] = useState<any[] | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('⏱️ Fallback timeout triggered');
      setLoading(false);
    }, 8000);

    const checkAndInsertUser = async () => {
      console.log('🔁 checkAndInsertUser running...');

      try {
        const result = await supabase.auth.getSession();
        const session = result?.data?.session;
        const sessionError = result?.error;

        console.log('📦 session:', session);

        if (sessionError || !session?.user) {
          console.warn('🚫 Invalid session — forcing logout');
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
          document.cookie = '';
          window.location.href = '/login';
          return;
        }

        const user = session.user;
        setUserEmail(user.email);

        const { error: upsertError } = await supabase.from('users').upsert(
          {
            id: user.id,
            email: user.email,
            role: 'freemium',
            spotify_access_token: session.provider_token,
            spotify_refresh_token: session.provider_refresh_token,
            token_expires_at: new Date(Date.now() + 3600 * 1000),
          },
          { onConflict: 'id' }
        );

        if (upsertError) {
          console.error('🛑 Error upserting user:', upsertError.message);
        } else {
          console.log('✅ User upserted with tokens');
        }

        const { data: userData, error: tokenFetchError } = await supabase
          .from('users')
          .select('spotify_access_token')
          .eq('id', user.id)
          .single();

        if (tokenFetchError) {
          console.error('🔐 Token fetch error:', tokenFetchError.message);
        }

        const token = userData?.spotify_access_token;
        setAccessToken(token);

        if (token) {
          await fetchNowPlaying(token);
          await fetchDevices(token);
        } else {
          console.warn('⚠️ No Spotify token found — skipping playback fetch');
        }
      } catch (err) {
        console.error('🔥 Unexpected error in checkAndInsertUser:', err);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    checkAndInsertUser();
  }, [router]);

  const fetchNowPlaying = async (token: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = await res.text();
      console.log('🎧 Now Playing status:', res.status);
      console.log('📦 Raw Now Playing response:', raw);

      if (res.ok && res.status !== 204) {
        const data = JSON.parse(raw);
        setNowPlaying(data);
      } else {
        setNowPlaying(null);
      }
    } catch (err) {
      console.error('💥 fetchNowPlaying error:', err);
    }
  };

  const fetchDevices = async (token: string) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setDevices(data.devices);
    } catch (err) {
      console.error('💥 fetchDevices error:', err);
    }
  };

  const transferPlayback = async (deviceId: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [deviceId], play: true }),
      });

      if (res.ok) {
        await fetchNowPlaying(accessToken);
      } else {
        console.warn('⚠️ Failed to transfer playback:', res.status);
      }
    } catch (err) {
      console.error('💥 transferPlayback error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = '';
      window.location.href = '/login';
    }
  };

  const track = nowPlaying?.item;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p>Loading session...</p>
        <button
          onClick={() => setLoading(false)}
          className="mt-4 text-sm text-blue-600 underline"
        >
          Force exit loading state
        </button>
      </div>
    );
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

      {devices && (
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">Available Devices:</h2>
          {devices.length === 0 ? (
            <p className="text-gray-500">No active Spotify devices found.</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((device) => (
                <li key={device.id} className="flex justify-between items-center border p-2 rounded-md">
                  <span>{device.name} {device.is_active && '✅'}</span>
                  <button
                    onClick={() => transferPlayback(device.id)}
                    className="px-2 py-1 bg-green-600 text-white rounded-md text-sm"
                  >
                    Connect
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
