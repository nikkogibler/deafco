import { supabase } from '../lib/supabase'

export default function Login() {
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'spotify' })
  }

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
  )
}
