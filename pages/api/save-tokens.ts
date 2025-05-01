// /pages/api/save-tokens.ts
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user_id, access_token, refresh_token, expires_in } = req.body

  if (!user_id || !access_token || !refresh_token || !expires_in) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ ADMIN ACCESS
  )

  const { error } = await supabase
    .from('users')
    .update({
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000),
    })
    .eq('id', user_id)

  if (error) {
    console.error('❌ Admin token save failed:', error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
