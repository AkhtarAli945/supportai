const asyncHandler = require("express-async-handler");
const Workspace = require("../models/Workspace");
const User = require("../models/User");

// @desc  Get current user's workspace
// @route GET /api/workspaces/me
const getMyWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.user.workspaceId);
  if (!workspace) {
    res.status(404);
    throw new Error("Workspace not found");
  }
  res.json(workspace);
});

// @desc  Update workspace settings (agent personality, escalation rules, branding)
// @route PUT /api/workspaces/me
const updateMyWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.user.workspaceId);
  if (!workspace) {
    res.status(404);
    throw new Error("Workspace not found");
  }

  const { name, settings } = req.body;
  if (name) workspace.name = name;
  if (settings) workspace.settings = { ...workspace.settings.toObject(), ...settings };

  await workspace.save();
  res.json(workspace);
});

// @desc  List agents in the workspace
// @route GET /api/workspaces/agents
const listAgents = asyncHandler(async (req, res) => {
  const agents = await User.find({
    workspaceId: req.user.workspaceId,
    role: "support_agent",
  }).select("-password");
  res.json(agents);
});

// @desc  Get embed snippet for a workspace
// @route GET /api/workspaces/embed-code
const getEmbedCode = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.user.workspaceId);
  const widgetUrl = `${process.env.CLIENT_URL_WIDGET || "https://cdn.yoursupportai.com"}/supportai-widget.js`;
  const snippet = `<script src="${widgetUrl}" data-workspace-id="${workspace.embedKey}" data-api-url="${
    process.env.PUBLIC_API_URL || "http://localhost:5000"
  }"></script>`;
  res.json({ embedKey: workspace.embedKey, snippet });
});

// [SUPER ADMIN] @desc List all workspaces
// @route GET /api/workspaces
const listAllWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find().populate("ownerId", "name email");
  res.json(workspaces);
});

module.exports = { getMyWorkspace, updateMyWorkspace, listAgents, getEmbedCode, listAllWorkspaces };
