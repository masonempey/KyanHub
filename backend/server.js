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

// Configure CORS to allow requests from your frontend's origin
const corsOptions = {
  origin: "https://kyanhub.vercel.app",
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Content-Type",
    "Date",
    "X-Api-Version",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

// Test route before anything else
app.get("/api", (req, res) => {
  console.log("Accessed /api route");
  res.status(200).json({ message: "Server is running!" });
});

// Unauthenticated routes
app.use("/api/inventory/products", inventoryRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/igms", igmsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);

// Authenticated routes with middleware
app.use("/api", authMiddleware);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/maintenance", maintenanceRoutes);

// Initialize database on first invocation
let isInitialized = false;
app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      console.log("Initializing database...");
      await initDatabase();
      console.log("Database initialized successfully");
      isInitialized = true;
    } catch (error) {
      console.error("Database initialization failed:", error);
      return res.status(500).json({
        error: "Server initialization failed",
        details: error.message,
      });
    }
  }
  next();
});

// Export the serverless function (use default export for clarity)
module.exports = serverless(app);
