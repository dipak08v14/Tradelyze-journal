let clipExtractor = null
let isModelLoading = false

async function loadClipModel() {
  if (clipExtractor) return clipExtractor
  if (isModelLoading) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return loadClipModel()
  }
  isModelLoading = true
  try {
    const { pipeline, env } = await import(
      'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm'
    )
    env.allowLocalModels = false
    env.useBrowserCache = true
    clipExtractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32')
    isModelLoading = false
    return clipExtractor
  } catch (err) {
    isModelLoading = false
    throw err
  }
}

async function generateEmbedding(imageDataUrl) {
  const extractor = await loadClipModel()
  const output = await extractor(imageDataUrl, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'GENERATE_EMBEDDING') {
    generateEmbedding(message.imageDataUrl)
      .then(embedding => {
        chrome.runtime.sendMessage({ type: 'CLIP_RESULT', embedding })
      })
      .catch(err => {
        chrome.runtime.sendMessage({ type: 'CLIP_RESULT', error: err.message })
      })
  }
})
