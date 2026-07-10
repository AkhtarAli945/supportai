const KnowledgeDoc = require("../models/KnowledgeDoc");
const { embedText, cosineSimilarity } = require("./embeddingService");

/**
 * Retrieves the top-K most relevant knowledge chunks for a query within a workspace.
 * This is a simple in-memory cosine-similarity search across all chunks belonging
 * to the workspace's ready knowledge docs. Fine for small/medium KBs; swap for
 * Pinecone/pgvector for large-scale production use (see README).
 */
async function retrieveRelevantChunks(workspaceId, query, topK = 4) {
  const queryVector = await embedText(query);

  const docs = await KnowledgeDoc.find({ workspaceId, status: "ready" }).lean();

  const scored = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const score = cosineSimilarity(queryVector, chunk.embedding);
      scored.push({ text: chunk.text, score, filename: doc.filename });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

module.exports = { retrieveRelevantChunks };
