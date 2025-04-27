import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { supabase } from '@/lib/supabaseClient'; // adjust if needed

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;

        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!data && !error) {
          await supabase.from('users').insert([
            {
              id: user.id,
              email: user.email,
              role: 'freemium',
            },
          ]);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return <Component {...pageProps} />;
}
