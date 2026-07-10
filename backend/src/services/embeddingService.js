/**
 * Local embedding service using @xenova/transformers (runs in-process, no API key).
 * Model is lazy-loaded once and reused (singleton pattern) since loading is slow.
 */
let embedderPromise = null;

async function getEmbedder() {
  if (!embedderPromise) {
    // Dynamic import because @xenova/transformers is an ESM package
    embedderPromise = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2")
    );
  }
  return embedderPromise;
}

/**
 * Embed a single string of text -> returns array of floats (384-dim for MiniLM-L6-v2)
 */
async function embedText(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/**
 * Embed multiple chunks efficiently (sequentially to keep memory low on free-tier hosting)
 */
async function embedChunks(chunks) {
  const embeddings = [];
  for (const chunk of chunks) {
    const vector = await embedText(chunk);
    embeddings.push(vector);
  }
  return embeddings;
}

/**
 * Splits raw text into overlapping chunks for better retrieval context.
 */
function chunkText(text, chunkSize = 800, overlap = 150) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 20);
}

function cosineSimilarity(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { embedText, embedChunks, chunkText, cosineSimilarity };
