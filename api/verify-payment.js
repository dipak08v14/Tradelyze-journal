import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { razorpay_order_id, razorpay_payment_id,
          razorpay_signature, userId } = req.body

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body.toString())
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed' })
  }

  // Update user subscription in Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  )

  const { error } = await supabase.from('users').update({
    subscription_plan: 'pro',
    subscription_status: 'active',
    razorpay_customer_id: razorpay_payment_id
  }).eq('id', userId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
