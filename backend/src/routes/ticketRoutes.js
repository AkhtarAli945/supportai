const express = require("express");
const router = express.Router();
const { listTickets, getTicket, updateTicket, replyToTicket } = require("../controllers/ticketController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, listTickets);
router.get("/:id", protect, getTicket);
router.put("/:id", protect, updateTicket);
router.post("/:id/reply", protect, replyToTicket);

module.exports = router;
