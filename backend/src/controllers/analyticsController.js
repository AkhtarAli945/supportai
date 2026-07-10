const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");
const Ticket = require("../models/Ticket");

// @desc  Dashboard analytics summary for the workspace
// @route GET /api/analytics/summary
const getSummary = asyncHandler(async (req, res) => {
  const workspaceId = req.user.workspaceId;

  const [totalConversations, escalatedCount, resolvedTickets, openTickets, sentimentAgg, intentAgg] =
    await Promise.all([
      Conversation.countDocuments({ workspaceId }),
      Conversation.countDocuments({ workspaceId, escalated: true }),
      Ticket.countDocuments({ workspaceId, status: "resolved" }),
      Ticket.countDocuments({ workspaceId, status: { $ne: "resolved" } }),
      Conversation.aggregate([
        { $match: { workspaceId } },
        { $group: { _id: "$sentiment", count: { $sum: 1 } } },
      ]),
      Conversation.aggregate([
        { $match: { workspaceId, intent: { $ne: "" } } },
        { $group: { _id: "$intent", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

  const resolutionRate =
    resolvedTickets + openTickets > 0 ? Math.round((resolvedTickets / (resolvedTickets + openTickets)) * 100) : 0;

  const aiDeflectionRate =
    totalConversations > 0 ? Math.round(((totalConversations - escalatedCount) / totalConversations) * 100) : 0;

  res.json({
    totalConversations,
    escalatedCount,
    resolvedTickets,
    openTickets,
    resolutionRate,
    aiDeflectionRate,
    sentimentBreakdown: sentimentAgg.reduce((acc, s) => ({ ...acc, [s._id || "neutral"]: s.count }), {}),
    topIntents: intentAgg.map((i) => ({ intent: i._id, count: i.count })),
  });
});

module.exports = { getSummary };
