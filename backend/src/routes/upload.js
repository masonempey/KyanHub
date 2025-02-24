const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const GoogleService = require("../services/googleService");

dotenv.config();

router.post("/maintenance", async (req, res) => {
  try {
    const { propertyName, monthYear, file, fileName } = req.body;

    console.log("Uploading maintenance receipt:", propertyName, monthYear);

    if (!propertyName || !monthYear) {
      return res.status(400).json({
        success: false,
        error: "Property name and month/year are required",
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const base64Data = file.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // Initialize Google Drive service
    await GoogleService.init();

    // Find or create the receipts folder
    const receiptsFolderId = await GoogleService.findReceiptsFolder(
      propertyName,
      monthYear
    );

    // Upload the file
    const { fileId, webViewLink } = await GoogleService.uploadPDF(
      buffer,
      fileName,
      receiptsFolderId
    );

    res.status(200).json({
      success: true,
      data: {
        fileId,
        webViewLink,
        message: "File uploaded successfully",
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
