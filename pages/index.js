import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/login')
  }, [router])

  return null
}

export default function Home() {
  return <h1>Deaf Co. SonicSuite</h1>
}
