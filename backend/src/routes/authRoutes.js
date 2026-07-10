const express = require("express");
const router = express.Router();
const { registerBusinessOwner, inviteSupportAgent, login, getMe } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/register", registerBusinessOwner);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/invite-agent", protect, authorize("business_owner"), inviteSupportAgent);

module.exports = router;
