import Razorpay from 'razorpay'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })

    const order = await instance.orders.create({
      amount: 199900, // ₹1,999 in paise
      currency: 'INR',
      receipt: `tradelyze_${Date.now()}`,
      notes: { userId: req.body.userId, plan: 'pro' }
    })

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
