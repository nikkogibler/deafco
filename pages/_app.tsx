import { useEffect, useState } from 'react'
import { AppProps } from 'next/app'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider, useSessionContext } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import '@/styles/globals.css'

function AuthRedirectHandler() {
  const { isLoading, session } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && session) {
      const next = new URLSearchParams(window.location.search).get('next')
      if (next) {
        router.replace(next)
      }
    }
  }, [isLoading, session, router])

  return null
}

function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={pageProps.initialSession}>
      <AuthRedirectHandler />
      <Component {...pageProps} />
    </SessionContextProvider>
  )
}

export default MyApp
