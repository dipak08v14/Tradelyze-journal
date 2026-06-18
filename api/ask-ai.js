import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured. Please add GEMINI_API_KEY.' })
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: question,
      config: {
        systemInstruction: systemPrompt
      }
    });

    const answer = response.text || 'No response received.';
    const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

    return res.status(200).json({ answer, tokensUsed })

  } catch (error) {
    return res.status(500).json({ error: 'Failed to reach AI service: ' + error.message })
  }
}

