const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const MaintenanceService = require("../services/maintenanceService");

dotenv.config();

router.post("/", async (req, res) => {
  try {
    const maintenanceData = req.body;
    await MaintenanceService.insertMaintenance(maintenanceData);

    res.status(200).json({
      success: true,
      message: "Maintenance data inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting maintenance data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
