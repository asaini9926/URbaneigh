const express = require("express");
const router = express.Router();
const upload = require("../config/uploadConfig");

// 1. Single Upload (Keep this for backward compatibility if needed)
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const fullUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;
  res.json({ url: fullUrl });
});

// 2. Multiple Uploads (NEW)
// Accepts field name 'images' and max 10 files
router.post("/multiple", upload.array("images", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Map all files to their URLs
    const urls = req.files.map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );

    res.json({ urls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
