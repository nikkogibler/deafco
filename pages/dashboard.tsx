import { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAndInsertUser = async () => {
      console.log('🚨 checkAndInsertUser is running');

      const result = await supabase.auth.getSession();
      console.log('🧠 Session result:', result);

      const session = result?.data?.session;
      const sessionError = result?.error;

      if (sessionError) {
        console.error('❌ Error getting session:', sessionError);
        alert('Failed to get Supabase session.');
        return;
      }

      const user = session?.user;
      if (!user) {
        console.log('🚫 No user found in session');
        alert('No user found — not logged in.');
        router.push('/login');
        return;
      }

      setUserEmail(user.email);

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      console.log('🔍 Fetch result:', { data, error });

      if (!data && !error) {
        console.log('📥 Inserting new user...');
        const { error: insertError } = await supabase.from('users').insert([
          {
            id: user.id as unknown as string,
            email: user.email,
            role: 'freemium',
          },
        ]);

        if (insertError) {
          console.error('🔥 INSERT ERROR:', insertError.message || insertError);
          alert('Error inserting user: ' + (insertError.message || insertError));
        } else {
          console.log('✅ User inserted successfully');
          alert('User inserted into Supabase!');
        }
      } else if (error) {
        console.error('❌ Error fetching user:', error);
        alert('Error checking user: ' + error.message);
      } else {
        console.log('✅ User already exists:', data);
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
