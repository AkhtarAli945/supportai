const express = require("express");
const router = express.Router();
const {
  getMyWorkspace,
  updateMyWorkspace,
  listAgents,
  getEmbedCode,
  listAllWorkspaces,
} = require("../controllers/workspaceController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/me", protect, getMyWorkspace);
router.put("/me", protect, authorize("business_owner"), updateMyWorkspace);
router.get("/agents", protect, listAgents);
router.get("/embed-code", protect, authorize("business_owner"), getEmbedCode);
router.get("/", protect, authorize("super_admin"), listAllWorkspaces);

module.exports = router;
