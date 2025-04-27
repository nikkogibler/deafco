import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listen for auth state changes after OAuth redirect
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        console.log('Redirecting to dashboard from auth state change...');
        router.push('/dashboard');
      } else {
        setIsReady(true); // show login button
      }
    });

    // In case the user already has a session stored
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        console.log('Session already exists — redirecting...');
        router.push('/dashboard');
      } else {
        setIsReady(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: 'https://deafco.vercel.app/login' // important: go back to /login
      }
    });
  };

  if (!isReady) return <p>Loading...</p>;

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
