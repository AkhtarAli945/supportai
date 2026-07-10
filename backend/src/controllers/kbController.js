const asyncHandler = require("express-async-handler");
const axios = require("axios");
const cheerio = require("cheerio");
const { PDFParse } = require("pdf-parse");
const KnowledgeDoc = require("../models/KnowledgeDoc");
const { chunkText, embedChunks } = require("../services/embeddingService");

async function processAndSaveDoc(doc, rawText) {
  try {
    const chunks = chunkText(rawText);
    const vectors = await embedChunks(chunks);
    doc.chunks = chunks.map((text, i) => ({ text, embedding: vectors[i] }));
    doc.rawText = rawText.slice(0, 5000); // store a preview only
    doc.status = "ready";
    await doc.save();
  } catch (err) {
    doc.status = "failed";
    await doc.save();
    console.error("KB processing failed:", err.message);
  }
}

// @desc  Upload a PDF/text file to the knowledge base
// @route POST /api/kb/upload
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  let rawText = "";
  if (req.file.mimetype === "application/pdf") {
    try {
      const parser = new PDFParse({
        data: req.file.buffer,
      });

      const result = await parser.getText();

      rawText = result.text;

      await parser.destroy();
    } catch (err) {
      console.error("PDF Parse Error:", err);
      res.status(400);
      throw new Error("Invalid or unsupported PDF file.");
    }
  } else {
    rawText = req.file.buffer.toString("utf-8");
  }
  const doc = await KnowledgeDoc.create({
    workspaceId: req.user.workspaceId,
    filename: req.file.originalname,
    sourceType: req.file.mimetype === "application/pdf" ? "pdf" : "text",
    status: "processing",
  });

  res.status(202).json({
    message: "Upload received, processing in background",
    docId: doc._id,
  });

  // Process asynchronously so the request returns fast
  processAndSaveDoc(doc, rawText);
});

// @desc  Ingest a URL (scrape + chunk + embed)
// @route POST /api/kb/url
const ingestUrl = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400);
    throw new Error("url is required");
  }

  const { data: html } = await axios.get(url, { timeout: 10000 });
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  const text = $("body").text();

  const doc = await KnowledgeDoc.create({
    workspaceId: req.user.workspaceId,
    filename: url,
    sourceType: "url",
    sourceUrl: url,
    status: "processing",
  });

  res.status(202).json({
    message: "URL received, processing in background",
    docId: doc._id,
  });

  processAndSaveDoc(doc, text);
});

// @desc  List knowledge base docs for the workspace
// @route GET /api/kb
const listDocuments = asyncHandler(async (req, res) => {
  const docs = await KnowledgeDoc.find({
    workspaceId: req.user.workspaceId,
  }).select("-chunks.embedding");
  res.json(docs);
});

// @desc  Delete a knowledge base doc
// @route DELETE /api/kb/:id
const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await KnowledgeDoc.findOne({
    _id: req.params.id,
    workspaceId: req.user.workspaceId,
  });
  if (!doc) {
    res.status(404);
    throw new Error("Document not found");
  }
  await doc.deleteOne();
  res.json({ message: "Document deleted" });
});

module.exports = { uploadDocument, ingestUrl, listDocuments, deleteDocument };
