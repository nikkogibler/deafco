// pages/_app.tsx
import { useState } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }) {
const [supabase] = useState(() => createPagesBrowserClient())

  return (
    <SessionContextProvider
      supabaseClient={supabase}
      initialSession={pageProps.initialSession}
    >
      <div className="bg-gray-900 text-white min-h-screen">
        <Component {...pageProps} />
      </div>
    </SessionContextProvider>
  )
}
