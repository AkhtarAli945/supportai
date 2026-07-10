const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["customer", "agent", "ai"], required: true },
    text: { type: String, required: true },
    attachmentUrl: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    customerId: { type: String, required: true }, // anonymous visitor id (uuid from widget)
    customerName: { type: String, default: "Website Visitor" },
    messages: { type: [messageSchema], default: [] },
    status: { type: String, enum: ["ai_handling", "escalated", "resolved"], default: "ai_handling" },
    escalated: { type: Boolean, default: false },
    escalationReason: { type: String, default: "" },
    sentiment: { type: String, enum: ["positive", "neutral", "negative"], default: "neutral" },
    intent: { type: String, default: "" },
    summary: { type: String, default: "" },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
