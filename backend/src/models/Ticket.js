const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: { type: String, enum: ["open", "pending", "resolved"], default: "open" },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    tags: { type: [String], default: [] },
    subject: { type: String, default: "New support request" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
