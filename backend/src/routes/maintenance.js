const express = require("express");
const router = express.Router();
const MaintenanceService = require("../services/maintenanceService");

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

router.get("/companies", async (req, res) => {
  try {
    const companies = await MaintenanceService.getCompanies();
    res.status(200).json({ success: true, companies });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/categories", async (req, res) => {
  try {
    console.log("Fetching categories");
    const categories = await MaintenanceService.getCategories();

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/add-company/:companyName", async (req, res) => {
  try {
    const { companyName } = req.params;

    await MaintenanceService.insertCompany(companyName);

    res.status(200).json({
      success: true,
      message: "Company data inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting company data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/add-category/:category", async (req, res) => {
  try {
    const { category } = req.params;

    await MaintenanceService.insertCategory(category);

    res.status(200).json({
      success: true,
      message: "Category data inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting company data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete("/delete-company/:companyName", async (req, res) => {
  try {
    const { companyName } = req.params;

    await MaintenanceService.deleteCompany(companyName);

    res.status(200).json({
      success: true,
      message: "Company data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete("/delete-category/:category", async (req, res) => {
  try {
    const { category } = req.params;

    await MaintenanceService.deleteCategory(category);

    res.status(200).json({
      success: true,
      message: "Category data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
