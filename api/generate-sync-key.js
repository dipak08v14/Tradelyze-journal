import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Set up Supabase client with admin credentials (service role key)
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  try {
    // Authenticate the user using JWT
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = user.id

    // Parse the body
    let body = req.body || {}
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' })
      }
    }

    const { broker_name, connection_type, account_login } = body

    if (!broker_name || !connection_type) {
      return res.status(400).json({ error: 'Missing required fields: broker_name and connection_type' })
    }

    if (connection_type !== 'mt5' && connection_type !== 'mt4') {
      return res.status(400).json({ error: 'connection_type must be either mt5 or mt4' })
    }

    // Generate custom unique API key: prefix "tls_" followed by UUID v4 with hyphens stripped
    const uniqueId = crypto.randomUUID().replace(/-/g, '')
    const apiKey = `tls_${uniqueId}`

    // Insert new connection row
    const { data: insertedData, error: insertError } = await supabase
      .from('broker_connections')
      .insert({
        user_id: userId,
        broker_name,
        connection_type,
        api_key: apiKey,
        account_login: account_login || null,
        is_active: true,
        total_synced: 0
      })
      .select()

    if (insertError) {
      return res.status(500).json({
        error: 'Failed to create connection',
        message: insertError.message
      })
    }

    const connectionId = insertedData && insertedData[0] ? insertedData[0].id : null

    return res.status(200).json({
      success: true,
      api_key: apiKey,
      connection_id: connectionId
    })

  } catch (err) {
    return res.status(500).json({
      error: 'Failed to create connection',
      message: err.message
    })
  }
}
