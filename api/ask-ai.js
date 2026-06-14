export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  } else if (req.body) {
    body = req.body;
  }

  const { question, systemPrompt } = body;

  if (!question || !systemPrompt) {
    return res.status(400).json({ error: 'Question and system prompt are required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured. Please add ANTHROPIC_API_KEY.' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Claude API error'
      })
    }

    const answer = data.content?.[0]?.text || 'No response received.'
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

    return res.status(200).json({ answer, tokensUsed })

  } catch (error) {
    return res.status(500).json({ error: 'Failed to reach AI service: ' + error.message })
  }
}
