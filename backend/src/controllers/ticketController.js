const asyncHandler = require("express-async-handler");
const Ticket = require("../models/Ticket");
const Conversation = require("../models/Conversation");

// @desc  List tickets for the workspace (filterable by status/priority)
// @route GET /api/tickets
const listTickets = asyncHandler(async (req, res) => {
  const { status, priority, assignedAgent } = req.query;
  const filter = { workspaceId: req.user.workspaceId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedAgent) filter.assignedAgent = assignedAgent;

  const tickets = await Ticket.find(filter)
    .populate("conversationId")
    .populate("assignedAgent", "name email")
    .sort({ createdAt: -1 });

  res.json(tickets);
});

// @desc  Get single ticket + full conversation
// @route GET /api/tickets/:id
const getTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId })
    .populate("conversationId")
    .populate("assignedAgent", "name email");
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found");
  }
  res.json(ticket);
});

// @desc  Assign / update ticket status or priority
// @route PUT /api/tickets/:id
const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found");
  }

  const { status, priority, assignedAgent, tags } = req.body;
  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (assignedAgent !== undefined) ticket.assignedAgent = assignedAgent;
  if (tags) ticket.tags = tags;

  await ticket.save();

  if (status === "resolved") {
    await Conversation.findByIdAndUpdate(ticket.conversationId, { status: "resolved" });
  }

  res.json(ticket);
});

// @desc  Agent replies to an escalated conversation (also handled live via Socket.IO)
// @route POST /api/tickets/:id/reply
const replyToTicket = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const ticket = await Ticket.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found");
  }

  const conversation = await Conversation.findById(ticket.conversationId);
  conversation.messages.push({ sender: "agent", text: message });
  conversation.assignedAgent = req.user._id;
  await conversation.save();

  if (!ticket.assignedAgent) {
    ticket.assignedAgent = req.user._id;
    ticket.status = "pending";
    await ticket.save();
  }

  const io = req.app.get("io");
  io.to(`conversation_${conversation._id}`).emit("new_agent_message", {
    conversationId: conversation._id,
    message: { sender: "agent", text: message, createdAt: new Date() },
  });

  res.json({ message: "Reply sent" });
});

module.exports = { listTickets, getTicket, updateTicket, replyToTicket };
