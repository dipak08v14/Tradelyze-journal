let extractor: any = null;
let isModelLoading = false;
let modelLoadPromise: Promise<any> | null = null;

export async function loadCLIPModel(onProgress?: (pct: number, file: string) => void): Promise<any> {
  // Return cached model if already loaded
  if (extractor) return extractor;

  // Return existing load promise if already loading
  if (isModelLoading && modelLoadPromise) return modelLoadPromise;

  isModelLoading = true;
  modelLoadPromise = (async () => {
    try {
      // Dynamic import — only loads when called, not on app startup
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true; // Cache model in browser IndexedDB

      extractor = await pipeline(
        'image-feature-extraction',
        'Xenova/clip-vit-base-patch32',
        {
          progress_callback: (progress: any) => {
            if (onProgress && progress.status === 'progress') {
              const pct = Math.round(progress.progress || 0);
              onProgress(pct, progress.file || 'model');
            }
          }
        }
      );
      isModelLoading = false;
      return extractor;
    } catch (err) {
      isModelLoading = false;
      extractor = null;
      throw err;
    }
  })();

  return modelLoadPromise;
}

export async function generateEmbeddingFromUrl(
  imageUrl: string,
  onProgress?: (pct: number, file: string) => void
): Promise<number[]> {
  /**
   * Generate 512-dim embedding from a chart image URL.
   * Image is fetched as blob first to avoid CORS issues.
   */
  let blobUrl: string | null = null;
  try {
    // Fetch image as blob to handle CORS
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    const blob = await response.blob();
    blobUrl = URL.createObjectURL(blob);

    // Load CLIP model (cached after first load)
    const model = await loadCLIPModel(onProgress);

    // Generate embedding
    const output = await model(blobUrl, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data) as number[];

    return embedding; // Array of 512 numbers
  } finally {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}

export interface LibraryConfidence {
  level: 'empty' | 'building' | 'growing' | 'good' | 'excellent';
  message: string;
  color: string;
}

export function getLibraryConfidenceMessage(count: number): LibraryConfidence {
  if (count === 0) return { level: 'empty', message: 'No charts in visual library yet', color: 'text-zinc-500' };
  if (count < 10) return { level: 'building', message: `Building library (${count}/10 minimum)`, color: 'text-amber-400' };
  if (count < 30) return { level: 'growing', message: `Growing library (${count}/30 for reliable matches)`, color: 'text-amber-400' };
  if (count < 100) return { level: 'good', message: `Good matching quality (${count} charts)`, color: 'text-emerald-400' };
  return { level: 'excellent', message: `High accuracy (${count} charts)`, color: 'text-emerald-400' };
}
