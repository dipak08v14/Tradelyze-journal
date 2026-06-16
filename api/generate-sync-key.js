import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    const { broker_name, connection_type, account_login } = req.body
    if (!broker_name || !connection_type) {
      return res.status(400).json({ error: 'broker_name and connection_type are required' })
    }

    const api_key = 'tls_' + randomUUID().replace(/-/g, '')

    const { data, error } = await supabase.from('broker_connections').insert({
      user_id: user.id,
      broker_name,
      connection_type,
      api_key,
      account_login: account_login || null,
      is_active: true,
      total_synced: 0
    }).select('id').single()

    if (error) return res.status(500).json({ error: 'Failed to create connection', message: error.message })

    return res.status(200).json({ success: true, api_key, connection_id: data.id })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create connection', message: err.message })
  }
}
