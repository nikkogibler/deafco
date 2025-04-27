import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // NEW

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;

      console.log('Session:', session);
      console.log('Error:', error);

      if (session?.user) {
        router.push('/dashboard');
      } else {
        setLoading(false); // Allow login button to show
      }
    };

    checkSession();
  }, []);

  const handleLogin = async () => {
    console.log('Logging in...');
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: 'https://deafco.vercel.app'
      }
    });
  };

  if (loading) return <p>Loading auth...</p>;

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
