const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    embedKey: { type: String, default: () => uuidv4(), unique: true },
    settings: {
      agentName: { type: String, default: "SupportAI Assistant" },
      agentPersonality: {
        type: String,
        default: "Friendly, concise, and professional customer support agent.",
      },
      escalationConfidenceThreshold: { type: Number, default: 0.55 },
      escalateOnNegativeSentiment: { type: Boolean, default: true },
      brandColor: { type: String, default: "#4F46E5" },
      welcomeMessage: { type: String, default: "Hi! How can I help you today?" },
      officeHoursOnly: { type: Boolean, default: false },
    },
    plan: { type: String, enum: ["free", "starter", "pro"], default: "free" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", workspaceSchema);
