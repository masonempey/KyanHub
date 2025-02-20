const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const serverless = require("serverless-http");
const { initDatabase } = require("./database/initDatabase");
const igmsRoutes = require("./src/routes/igms");
const pdfRoutes = require("./src/routes/pdf");
const authMiddleware = require("./src/middleware/authMiddleware");
const sheetsRoutes = require("./src/routes/sheets");
const inventoryRoutes = require("./src/routes/inventory");
const uploadRoutes = require("./src/routes/upload");
const maintenanceRoutes = require("./src/routes/maintenance");
const analyticsRoutes = require("./src/routes/analytics");
const userRoutes = require("./src/routes/users");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const initializeApp = async () => {
  try {
    await initDatabase();

    // Routes that do not require authentication
    app.use("/api/inventory/products", inventoryRoutes);
    app.use("/api/inventory", inventoryRoutes);
    app.use("/api/igms", igmsRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/users", userRoutes);

    // Apply authentication middleware
    app.use("/api", authMiddleware);

    // Routes that require authentication
    app.use("/api/sheets", sheetsRoutes);
    app.use("/api/pdf", pdfRoutes);
    app.use("/api/upload", uploadRoutes);
    app.use("/api/maintenance", maintenanceRoutes);

    // Optional: Add a root route for testing
    app.get("/", (req, res) => {
      res.send("Server is running!");
    });
  } catch (error) {
    console.error("Error initializing app:", error);
    throw error;
  }
};

// Initialize the app
initializeApp();

// Export the app as a serverless function
module.exports.handler = serverless(app);
