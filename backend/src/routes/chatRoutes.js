console.log("✅ chatRoutes loaded");

const express = require("express");
const router = express.Router();
const { handleWidgetMessage, getWidgetConfig } = require("../controllers/chatController");

router.post("/message", handleWidgetMessage);
router.get("/widget-config/:embedKey", getWidgetConfig);

module.exports = router;




// const express = require("express");
// const router = express.Router();

// console.log("✅ chatRoutes loaded");

// router.get("/test", (req, res) => {
//   res.json({ message: "Chat routes working" });
// });

// router.post("/message", (req, res) => {
//   res.json({
//     success: true,
//     message: "POST route working",
//   });
// });

// module.exports = router;