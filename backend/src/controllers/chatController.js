const asyncHandler = require("express-async-handler");
const Workspace = require("../models/Workspace");
const Conversation = require("../models/Conversation");
const Ticket = require("../models/Ticket");
const { runAgentGraph } = require("../agent/graph");

// @desc  Public endpoint hit by the embeddable widget for each customer message
// @route POST /api/chat/message
// body: { embedKey, customerId, customerName?, message, conversationId? }
const handleWidgetMessage = asyncHandler(async (req, res) => {
  const { embedKey, customerId, customerName, message, conversationId } = req.body;

  if (!embedKey || !customerId || !message) {
    res.status(400);
    throw new Error("embedKey, customerId, and message are required");
  }

  const workspace = await Workspace.findOne({ embedKey });
  if (!workspace) {
    res.status(404);
    throw new Error("Invalid workspace embed key");
  }

  let conversation = conversationId
    ? await Conversation.findById(conversationId)
    : await Conversation.create({
        workspaceId: workspace._id,
        customerId,
        customerName: customerName || "Website Visitor",
      });

  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }

  conversation.messages.push({ sender: "customer", text: message });

  // If already escalated to a human, don't run the AI - just persist and let socket layer handle delivery
  if (conversation.status === "escalated") {
    await conversation.save();
    const io = req.app.get("io");
    io.to(`workspace_${workspace._id}`).emit("new_customer_message", {
      conversationId: conversation._id,
      message: { sender: "customer", text: message, createdAt: new Date() },
    });
    return res.json({ conversationId: conversation._id, status: "escalated", reply: null });
  }

  const result = await runAgentGraph({
    workspaceId: workspace._id,
    query: message,
    history: conversation.messages.slice(0, -1),
    agentPersonality: workspace.settings.agentPersonality,
    escalationThreshold: workspace.settings.escalationConfidenceThreshold,
    escalateOnNegative: workspace.settings.escalateOnNegativeSentiment,
  });

  conversation.intent = result.intent;
  conversation.sentiment = result.sentiment;

  const io = req.app.get("io");

  if (result.escalate) {
    conversation.status = "escalated";
    conversation.escalated = true;
    conversation.escalationReason = result.escalationReason;
    conversation.summary = result.summary;
    await conversation.save();

    const ticket = await Ticket.create({
      workspaceId: workspace._id,
      conversationId: conversation._id,
      subject: result.summary?.slice(0, 80) || "Escalated conversation",
      priority: result.sentiment === "negative" ? "high" : "medium",
      tags: [result.intent].filter(Boolean),
    });

    io.to(`workspace_${workspace._id}`).emit("conversation_escalated", {
      conversation,
      ticket,
    });

    return res.json({
      conversationId: conversation._id,
      status: "escalated",
      reply: "I'm connecting you with a member of our team who can help further. Hang tight!",
    });
  }

  conversation.messages.push({ sender: "ai", text: result.answer });
  await conversation.save();

  res.json({ conversationId: conversation._id, status: "ai_handling", reply: result.answer });
});

// @desc  Get workspace public settings for widget bootstrapping (welcome msg, brand color)
// @route GET /api/chat/widget-config/:embedKey
const getWidgetConfig = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findOne({ embedKey: req.params.embedKey }).select("settings name");
  if (!workspace) {
    res.status(404);
    throw new Error("Invalid embed key");
  }
  res.json({ name: workspace.name, settings: workspace.settings });
});

module.exports = { handleWidgetMessage, getWidgetConfig };
