// /pages/auth/callback.tsx (upgraded)

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient, useUser, useSessionContext } from '@supabase/auth-helpers-react'

export default function AfterLogin() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const { isLoading } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    const createUserIfNotExists = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            spotify_access_token: user.user_metadata?.spotify_access_token || null,
          }, { onConflict: 'id' })

        if (error) {
          console.error('Failed to upsert user:', error)
        } else {
          console.log('User upserted successfully:', data)
          router.push('/dashboard')
        }
      }
    }

    if (!isLoading) {
      createUserIfNotExists()
    }
  }, [user, isLoading])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Finishing login...</h1>
    </div>
  )
}
