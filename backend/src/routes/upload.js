const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const GoogleService = require("../services/googleService");

dotenv.config();

router.post("/maintenance", async (req, res) => {
  try {
    const { propertyName, monthYear, file, fileName } = req.body;

    if (!propertyName || !monthYear) {
      return res.status(400).json({
        success: false,
        error: "Property name and owner's name are required",
      });
    }

    if (file) {
      const base64Data = file.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");

      await GoogleService.init();

      // Find the appropriate folder
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
    } else {
      res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
