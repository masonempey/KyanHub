// const express = require("express");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const serverless = require("serverless-http");
// const { initDatabase } = require("./database/initDatabase");
// const {
//   authMiddleware,
//   adminMiddleware,
// } = require("./src/middleware/authMiddleware");
// const igmsRoutes = require("./src/routes/igms");
// const pdfRoutes = require("./src/routes/pdf");
// const sheetsRoutes = require("./src/routes/sheets");
// const inventoryRoutes = require("./src/routes/inventory");
// const uploadRoutes = require("./src/routes/upload");
// const maintenanceRoutes = require("./src/routes/maintenance");
// const analyticsRoutes = require("./src/routes/analytics");
// const userRoutes = require("./src/routes/users");
// const googleRoutes = require("./src/routes/google");

// dotenv.config();

// const app = express();

// // CORS configuration
// const corsOptions = {
//   origin: "https://kyanhubfrontend.vercel.app",
//   methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
//   credentials: true,
//   allowedHeaders: [
//     "X-CSRF-Token",
//     "X-Requested-With",
//     "Accept",
//     "Accept-Version",
//     "Content-Length",
//     "Content-MD5",
//     "Content-Type",
//     "Date",
//     "X-Api-Version",
//   ],
//   optionsSuccessStatus: 204,
// };

// app.use(cors(corsOptions));
// app.use(express.json());

// // Log request origin for debugging
// app.use((req, res, next) => {
//   console.log("Request Origin:", req.headers.origin);
//   next();
// });

// // Handle OPTIONS requests explicitly
// app.options("*", cors(corsOptions), (req, res) => {
//   console.log("OPTIONS request received");
//   res.status(204).end();
// });

// // Simple root route
// app.get("/", (req, res) => {
//   console.log("Root route accessed");
//   res.status(200).json({ message: "Welcome to kyanhubbackend API!" });
// });

// app.get("/api", (req, res) => {
//   console.log("Accessed /api route");
//   res.status(200).json({ message: "Server is running!" });
// });

// // Initialize database once at startup, not per request
// let dbInitialized = false;
// let dbPromise = null;

// async function initializeDatabase() {
//   if (!dbInitialized && !dbPromise) {
//     console.log("Initializing database...");
//     dbPromise = initDatabase()
//       .then(() => {
//         console.log("Database initialized successfully");
//         dbInitialized = true;
//       })
//       .catch((error) => {
//         console.error("Database initialization failed at startup:", error);
//         throw error; // Let Vercel handle the failure
//       });
//   }
//   return dbPromise;
// }

// // Run initialization at startup
// initializeDatabase().catch((error) => {
//   console.error("Failed to start server due to DB error:", error);
//   process.exit(1); // Crash the process if DB fails to initialize
// });

// // Middleware to ensure DB is ready, but only awaits if not yet initialized
// app.use(async (req, res, next) => {
//   if (!dbInitialized) {
//     try {
//       app.use((req, res, next) => next());
//     } catch (error) {
//       return res.status(500).json({
//         error: "Database not ready",
//         details: error.message,
//       });
//     }
//   }
//   next();
// });

// // Define routes with authentication middleware
// app.use("/api/igms", authMiddleware, igmsRoutes);
// app.use("/api/pdf", authMiddleware, pdfRoutes);
// app.use("/api/sheets", authMiddleware, sheetsRoutes);
// app.use("/api/inventory", authMiddleware, inventoryRoutes);
// app.use("/api/upload", authMiddleware, uploadRoutes);
// app.use("/api/maintenance", authMiddleware, maintenanceRoutes);
// app.use("/api/analytics", authMiddleware, analyticsRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/google", googleRoutes);

// // Apply admin middleware to specific routes
// app.use("/api/admin", adminMiddleware);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error("Server error:", err.stack);
//   res.status(500).json({ error: "Something went wrong", details: err.message });
// });

// module.exports = serverless(app);

// // Export handler for Vercel
// module.exports.handler = serverless(app);

const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();

app.use(cors({ origin: "https://kyanhubfrontend.vercel.app" }));
app.use(express.json());

app.get("/", (req, res) => {
  console.log("Root route accessed");
  res.status(200).json({ message: "Minimal server running!" });
});

app.get("/test", (req, res) => {
  console.log("Test route accessed");
  res.status(200).json({ message: "Test endpoint!" });
});

module.exports = serverless(app);
