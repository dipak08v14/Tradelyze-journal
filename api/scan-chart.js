export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { imageDataUrl } = req.body
    if (!imageDataUrl) return res.status(400).json({ error: 'No image' })

    const { pipeline, env, RawImage } = await import('@xenova/transformers')
    env.allowLocalModels = false
    env.useBrowserCache = false

    const extractor = await pipeline(
      'image-feature-extraction',
      'Xenova/clip-vit-base-patch32'
    )

    const base64Data = imageDataUrl.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const blob = new Blob([buffer], { type: 'image/jpeg' })
    const image = await RawImage.fromBlob(blob)

    const output = await extractor(image, { pooling: 'mean', normalize: true })
    const embedding = Array.from(output.data)

    return res.status(200).json({ embedding })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
