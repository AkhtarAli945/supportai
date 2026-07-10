const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { _id: false }
);

const knowledgeDocSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    filename: { type: String, required: true },
    sourceType: { type: String, enum: ["pdf", "text", "url"], default: "text" },
    sourceUrl: { type: String, default: "" },
    rawText: { type: String, default: "" },
    chunks: { type: [chunkSchema], default: [] },
    status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("KnowledgeDoc", knowledgeDocSchema);
