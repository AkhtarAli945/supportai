const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Workspace = require("../models/Workspace");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// @desc  Register a new Business Owner + create their Workspace
// @route POST /api/auth/register
const registerBusinessOwner = asyncHandler(async (req, res) => {
  const { name, email, password, workspaceName } = req.body;

  if (!name || !email || !password || !workspaceName) {
    res.status(400);
    throw new Error("Please provide name, email, password, and workspaceName");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }

  const user = await User.create({ name, email, password, role: "business_owner" });

  const workspace = await Workspace.create({ name: workspaceName, ownerId: user._id });
  user.workspaceId = workspace._id;
  await user.save();

  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    workspace,
    token: generateToken(user._id),
  });
});

// @desc  Invite a support agent to a workspace (business owner only)
// @route POST /api/auth/invite-agent
const inviteSupportAgent = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }

  const agent = await User.create({
    name,
    email,
    password,
    role: "support_agent",
    workspaceId: req.user.workspaceId,
  });

  res.status(201).json({
    id: agent._id,
    name: agent.name,
    email: agent.email,
    role: agent.role,
  });
});

// @desc  Login
// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId },
    token: generateToken(user._id),
  });
});

// @desc  Get current logged-in user
// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

module.exports = { registerBusinessOwner, inviteSupportAgent, login, getMe };
