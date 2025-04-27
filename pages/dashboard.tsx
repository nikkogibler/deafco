// pages/dashboard.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!data?.user) {
        router.push('/login'); // Kick out if not logged in
      } else {
        // Optionally fetch full user from 'users' table
        const { data: fullUser } = await supabase
          .from('users')
          .select('email, role')
          .eq('email', data.user.email)
          .single();

        setUser(fullUser);
      }
    };

    checkUser();
  }, []);

  if (!user) return <p>Loading your vibe…</p>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Welcome to Your Dashboard 🎶</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
