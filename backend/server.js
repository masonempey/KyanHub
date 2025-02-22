const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { initDatabase } = require("./database/initDatabase");
const igmsRoutes = require("./src/routes/igms");
const pdfRoutes = require("./src/routes/pdf");
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

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Define routes with authentication middleware
app.use("/api/igms", authMiddleware, igmsRoutes);
app.use("/api/pdf", authMiddleware, pdfRoutes);
app.use("/api/sheets", authMiddleware, sheetsRoutes);
app.use("/api/inventory", authMiddleware, inventoryRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.use("/api/maintenance", authMiddleware, maintenanceRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);
app.use("/api/users", userRoutes);

// Apply admin middleware to specific routes
app.use("/api/admin", adminMiddleware);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("Initializing database...");
    await initDatabase();
    console.log("Database initialized successfully");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
