import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      console.log('Session:', data?.session);
      console.log('Error:', error);

      if (data?.session?.user) {
        router.push('/dashboard');
      }
    };

    checkSession();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: 'https://deafco.vercel.app' // must match Supabase site URL
      }
    });
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Welcome to SonicSuite 🌊</h1>
      <button
        onClick={handleLogin}
        style={{
          background: '#1DB954',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '5px',
          border: 'none',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        Log in with Spotify
      </button>
    </main>
  );
}
