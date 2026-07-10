const express = require("express");
const multer = require("multer");
const router = express.Router();
const { uploadDocument, ingestUrl, listDocuments, deleteDocument } = require("../controllers/kbController");
const { protect, authorize } = require("../middleware/authMiddleware");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post("/upload", protect, authorize("business_owner"), upload.single("file"), uploadDocument);
router.post("/url", protect, authorize("business_owner"), ingestUrl);
router.get("/", protect, listDocuments);
router.delete("/:id", protect, authorize("business_owner"), deleteDocument);

module.exports = router;
