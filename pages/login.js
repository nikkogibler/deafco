import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Runs once on load
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        router.push('/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });

    // Also watch for new sessions (after redirect from Spotify)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.push('/dashboard');
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: 'https://deafco.vercel.app/dashboard'
      }
    });
  };

  if (checkingAuth) return <p>Checking login...</p>;

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
