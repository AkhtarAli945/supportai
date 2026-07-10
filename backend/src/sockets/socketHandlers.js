const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Socket.IO namespaces/rooms convention:
 *  - `workspace_<id>`  : all dashboard staff (owner + agents) of a workspace, for live queue updates
 *  - `conversation_<id>`: a specific chat thread, joined by the widget client + the replying agent
 */
function registerSocketHandlers(io) {
  io.use(async (socket, next) => {
    // Dashboard clients authenticate with JWT; widget clients connect anonymously.
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        socket.user = user;
      } catch {
        // invalid token - allow connection but as anonymous (widget) client
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    // Dashboard staff joins their workspace room for live escalation alerts
    if (socket.user?.workspaceId) {
      socket.join(`workspace_${socket.user.workspaceId}`);
      socket.on("mark_online", async () => {
        await User.findByIdAndUpdate(socket.user._id, { isOnline: true });
        io.to(`workspace_${socket.user.workspaceId}`).emit("agent_status_changed", {
          userId: socket.user._id,
          isOnline: true,
        });
      });
    }

    // Widget/customer client joins a specific conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Agent joins a conversation room from the dashboard when opening a ticket
    socket.on("agent_join_conversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Live typing indicators
    socket.on("typing", ({ conversationId, sender }) => {
      socket.to(`conversation_${conversationId}`).emit("typing", { sender });
    });

    socket.on("disconnect", async () => {
      if (socket.user) {
        await User.findByIdAndUpdate(socket.user._id, { isOnline: false });
        if (socket.user.workspaceId) {
          io.to(`workspace_${socket.user.workspaceId}`).emit("agent_status_changed", {
            userId: socket.user._id,
            isOnline: false,
          });
        }
      }
    });
  });
}

module.exports = registerSocketHandlers;
