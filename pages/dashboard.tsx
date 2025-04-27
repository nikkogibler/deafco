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
    // 💣 Emergency fallback timeout
    const timeout = setTimeout(() => {
      console.warn('⚠️ Fallback: loading took too long. Forcing UI.');
      setLoading(false);
    }, 8000);

    const checkAndInsertUser = async () => {
      try {
        const result = await supabase.auth.getSession();
        console.log('⚙️ Supabase session fetch result:', result);

        const session = result?.data?.session;
        const sessionError = result?.error;

        console.log('📦 session:', session);
        console.log('🧨 sessionError:', sessionError);

        if (sessionError || !session?.user) {
          console.warn('🚫 No valid session found. Redirecting to /login');
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        const user = session.user;
        setUserEmail(user.email);

        // Insert or update user
        const { error: updateError } = await supabase
          .from('users')
          .update({ email: user.email, role: 'freemium' })
          .eq('id', user.id);

        if (updateError) {
          await supabase.from('users').insert([
            {
              id: user.id,
              email: user.email,
              role: 'freemium',
            },
          ]);
        }

        // Fetch Spotify token
        const { data: userData } = await supabase
          .from('users')
          .select('spotify_access_token')
          .eq('id', user.id)
          .single();

        const token = userData?.spotify_access_token;
        setAccessToken(token);

        if (token) {
          await fetchNowPlaying(token);
          await fetchDevices(token);
        }
      } catch (err) {
        console.error('🔥 Unexpected crash in checkAndInsertUser:', err);
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

      if (res.status === 204) {
        console.log('🟡 Nothing currently playing');
        setNowPlaying(null);
      } else if (res.ok) {
        const data = await res.json();
        console.log('🎶 Now Playing:', data);
        setNowPlaying(data);
      } else {
        console.warn('⚠️ Now playing fetch failed:', res.status);
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

      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
      } else {
        console.warn('⚠️ Device fetch failed:', res.status);
      }
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
        body: JSON.stringify({
          device_ids: [deviceId],
          play: true,
        }),
      });

      if (res.ok) {
        console.log('✅ Playback transferred to:', deviceId);
        await fetchNowPlaying(accessToken);
      } else {
        console.warn('❌ Failed to transfer playback:', res.status);
      }
    } catch (err) {
      console.error('💥 transferPlayback error:', err);
    }
  };

  const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login'; // full page reload
};


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg">Loading session...</p>
        {/* TEMPORARY DEBUG BUTTON */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
          className="text-xs text-red-500 underline mt-4"
        >
          Clear session (debug)
        </button>
      </div>
    );
  }

  const track = nowPlaying?.item;

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

      {devices && devices.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">Available Devices:</h2>
          <ul className="space-y-2">
            {devices.map((device) => (
              <li key={device.id} className="flex justify-between items-center border p-2 rounded-md">
                <span>{device.name}</span>
                <button
                  onClick={() => transferPlayback(device.id)}
                  className="px-2 py-1 bg-green-600 text-white rounded-md text-sm"
                >
                  Connect
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
