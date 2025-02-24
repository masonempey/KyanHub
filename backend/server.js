const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const serverless = require("serverless-http");
const { initDatabase } = require("./database/initDatabase");
const {
  authMiddleware,
  adminMiddleware,
} = require("./src/middleware/authMiddleware");
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

app.get("/api", (req, res) => {
  console.log("Accessed /api route");
  res.status(200).json({ message: "Server is running!" });
});

// Define routes with authentication middleware
app.use("/api/igms", authMiddleware, igmsRoutes);
app.use("/api/pdf", authMiddleware, pdfRoutes);
app.use("/api/sheets", authMiddleware, sheetsRoutes);
app.use("/api/inventory", authMiddleware, inventoryRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.use("/api/maintenance", authMiddleware, maintenanceRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/google", googleRoutes);

// Apply admin middleware to specific routes
app.use("/api/admin", adminMiddleware);

let dbPromise = null;
async function ensureDbInitialized() {
  if (!dbPromise) {
    console.log("Initializing database...");
    dbPromise = initDatabase().then(() => {
      console.log("Database initialized successfully");
    });
  }
  await dbPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (error) {
    console.error("Database initialization failed:", error);
    res.status(500).json({
      error: "Server initialization failed",
      details: error.message,
    });
  }
});

module.exports = serverless(app);
