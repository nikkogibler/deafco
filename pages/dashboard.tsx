import { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAndInsertUser = async () => {
      console.log('🚨 checkAndInsertUser is running');
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return;
      }

      const user = session?.user;
      if (!user) {
        console.log('No user found');
        router.push('/login');
        return;
      }

      setUserEmail(user.email); // Save to show in UI

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      console.log('Fetch result:', { data, error });

      if (!data && !error) {
        console.log('Inserting new user...');
        const { error: insertError } = await supabase.from('users').insert([
          {
            id: user.id as unknown as string, // force ID to correct shape
            email: user.email,
            role: 'freemium',
          },
        ]);

        if (insertError) {
          console.error('Error inserting user:', insertError);
        } else {
          console.log('User inserted successfully');
        }
      } else if (error) {
        console.error('Error fetching user:', error);
      } else {
        console.log('User already exists:', data);
      }
    };

    checkAndInsertUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Dashboard</h1>
      {userEmail ? (
        <>
          <p className="mb-4">Logged in as: {userEmail}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-black text-white rounded-xl"
          >
            Logout
          </button>
        </>
      ) : (
        <p>Loading session...</p>
      )}
    </div>
  );
}
