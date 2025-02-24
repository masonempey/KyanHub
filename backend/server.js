const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { initDatabase } = require("./database/initDatabase");
const {
  authMiddleware,
  adminMiddleware,
} = require("./src/middleware/authMiddleware");
const igmsRoutes = require("./src/routes/igms");
const pdfRoutes = require("./src/routes/pdf");
const sheetsRoutes = require("./src/routes/sheets");
const inventoryRoutes = require("./src/routes/inventory");
const uploadRoutes = require("./src/routes/upload");
const maintenanceRoutes = require("./src/routes/maintenance");
const analyticsRoutes = require("./src/routes/analytics");
const userRoutes = require("./src/routes/users");
const googleRoutes = require("./src/routes/google");

dotenv.config();

const app = express();

const corsOptions = {
  origin: "https://kyanhubfrontend.vercel.app",
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

// Log request origin for debugging
app.use((req, res, next) => {
  console.log("Request Origin:", req.headers.origin);
  next();
});

// Handle OPTIONS requests
app.options("*", cors(corsOptions), (req, res) => {
  console.log("OPTIONS request received");
  res.status(204).end();
});

// Initialize database at startup
let dbInitialized = false;
let dbPromise = null;

async function initializeDatabase() {
  if (!dbInitialized && !dbPromise) {
    console.log("Initializing database...");
    dbPromise = initDatabase()
      .then(() => {
        console.log("Database initialized successfully");
        dbInitialized = true;
      })
      .catch((error) => {
        console.error("Database initialization failed at startup:", error);
        dbInitialized = false; // Allow retries on subsequent requests
      });
  }
  return dbPromise;
}

// Run at startup but don’t crash
initializeDatabase(); // Removed .catch(process.exit)

// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      if (!dbInitialized) {
        throw new Error("Database failed to initialize after retry");
      }
    } catch (error) {
      console.error("DB check failed:", error.message);
      return res.status(503).json({
        error: "Service unavailable due to database issue",
        details: error.message,
      });
    }
  }
  next();
});

// Routes
app.get("/", (req, res) => {
  console.log("Root route accessed");
  res.status(200).json({ message: "Welcome to kyanhubbackend API!" });
});

app.get("/api", (req, res) => {
  console.log("Accessed /api route");
  res.status(200).json({ message: "Server is running!" });
});

app.use("/api/igms", authMiddleware, igmsRoutes);
app.use("/api/pdf", authMiddleware, pdfRoutes);
app.use("/api/sheets", authMiddleware, sheetsRoutes);
app.use("/api/inventory", authMiddleware, inventoryRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.use("/api/maintenance", authMiddleware, maintenanceRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/google", googleRoutes);

app.use("/api/admin", adminMiddleware);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Something went wrong", details: err.message });
});

module.exports = app;
