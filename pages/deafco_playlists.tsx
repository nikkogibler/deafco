import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function DeafCoPlaylists() {
  const [user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data?.user) return router.push('/login');

      const { data: userRecord } = await supabase
        .from('users')
        .select('email, role')
        .eq('email', data.user.email)
        .single();

      setUser(userRecord);

      if (userRecord?.role === 'freemium') {
        setPlaylists([
          'https://open.spotify.com/embed/playlist/37i9dQZF1DWXRqgorJj26U',
          'https://open.spotify.com/embed/playlist/37i9dQZF1DX6VdMW310YC7'
        ]);
      } else if (userRecord?.role === 'commercial') {
        setPlaylists([
          'https://open.spotify.com/embed/playlist/37i9dQZF1DWXRqgorJj26U',
          'https://open.spotify.com/embed/playlist/37i9dQZF1DX6VdMW310YC7',
          'https://open.spotify.com/embed/playlist/37i9dQZF1DX2sUQwD7tbmL'
        ]);
      } else {
        setPlaylists([
          'https://open.spotify.com/embed/playlist/37i9dQZF1DWXRqgorJj26U',
          'https://open.spotify.com/embed/playlist/37i9dQZF1DX6VdMW310YC7',
          'https://open.spotify.com/embed/playlist/37i9dQZF1DX2sUQwD7tbmL',
          'https://open.spotify.com/embed/playlist/37i9dQZF1DX4dyzvuaRJ0n'
        ]);
      }
    };

    loadUser();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">DeafCo Curated Playlists</h1>
      {playlists.map((url, idx) => (
        <div key={idx} className="mb-6">
          <iframe
            src={url}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
