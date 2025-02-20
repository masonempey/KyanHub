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

// Define routes and middleware
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

// Add a root /api route for testing
app.get("/api", (req, res) => {
  res.status(200).json({ message: "Server is running!" });
});

// Initialize database and return the app handler
module.exports.handler = async (event, context) => {
  try {
    await initDatabase(); // Ensure DB is initialized before handling requests
    return serverless(app)(event, context);
  } catch (error) {
    console.error("Error initializing database:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server initialization failed" }),
    };
  }
};
