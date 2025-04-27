import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

type Playlist = {
  id: string;
  title: string;
  spotify_url: string;
  description: string;
  tier: string;
};

export default function DeafCoPlaylists() {
  const [user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      // Auth check
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.push('/login');

      // Get user role
      const { data: userRecord } = await supabase
        .from('users')
        .select('email, role')
        .eq('email', auth.user.email)
        .single();

      setUser(userRecord);

      // Query all playlists matching user's role
      const { data: fetchedPlaylists } = await supabase
        .from('playlists')
        .select('*')
        .in('tier', ['freemium', userRecord?.role]); // Always show freemium + their tier

      setPlaylists(fetchedPlaylists || []);
    };

    loadData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Your Curated Playlists</h1>
      {playlists.map((playlist) => (
        <div key={playlist.id} className="mb-10">
          <h2 className="text-xl font-semibold">{playlist.title}</h2>
          <p className="text-gray-600 text-sm mb-2">{playlist.description}</p>
          <iframe
            src={playlist.spotify_url}
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
