import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Watch for live auth changes (esp. after Spotify login)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          router.push('/dashboard');
        } else {
          setCheckingAuth(false); // No session? Show login button
        }
      }
    );

    // Run once on mount too
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        router.push('/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: 'https://deafco.vercel.app'
      }
    });
  };

  if (checkingAuth) return <p>Checking login status…</p>;

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
