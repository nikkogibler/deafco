import { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowPlaying, setNowPlaying] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAndInsertUser = async () => {
      console.log('🚨 checkAndInsertUser is running');

      const result = await supabase.auth.getSession();
      console.log('🧠 Session result:', result);

      const session = result?.data?.session;
      const sessionError = result?.error;

      if (sessionError) {
        console.error('❌ Error getting session:', sessionError);
        alert('Failed to get Supabase session.');
        setLoading(false);
        return;
      }

      const user = session?.user;
      if (!user) {
        console.log('🚫 No user found in session');
        alert('No user found — not logged in.');
        router.push('/login');
        return;
      }

      setUserEmail(user.email);

      // Update or insert user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: user.email,
          role: 'freemium',
        })
        .eq('id', user.id);

      if (updateError) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              email: user.email,
              role: 'freemium',
            },
          ]);

        if (insertError) {
          console.error('🔥 Final INSERT FAIL:', insertError.message);
          alert('Cannot add you to the system. Contact support.');
        } else {
          console.log('✅ Inserted as fallback');
        }
      } else {
        console.log('✅ User updated successfully');
      }

      // Fetch Spotify tokens from users table
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('spotify_access_token')
        .eq('id', user.id)
        .single();

      if (userData?.spotify_access_token) {
        fetchNowPlaying(userData.spotify_access_token);
      }

      setLoading(false);
    };

    const fetchNowPlaying = async (accessToken: string) => {
      try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.status === 204) {
          setNowPlaying(null); // Nothing playing
        } else if (res.ok) {
          const data = await res.json();
          console.log('🎶 Now Playing:', data);
          setNowPlaying(data);
        } else {
          console.error('Failed to fetch now playing:', res.status);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };

    checkAndInsertUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading session...</p>
      </div>
    );
  }

  const track = nowPlaying?.item;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
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
        <div className="text-center">
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
        <p>No track currently playing.</p>
      )}
    </div>
  );
}
