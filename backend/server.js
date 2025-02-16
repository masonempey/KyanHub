const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { initDatabase } = require("./database/initDatabase");
const googleRoutes = require("./src/routes/google");
const igmsRoutes = require("./src/routes/igms");
const pdfRoutes = require("./src/routes/pdf");
const authMiddleware = require("./src/middleware/authMiddleware");
const sheetsRoutes = require("./src/routes/sheets");
const inventoryRoutes = require("./src/routes/inventory");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const startServer = async () => {
  try {
    await initDatabase();

    // Routes
    app.use("/api/google", googleRoutes);
    app.use("/api", authMiddleware);
    app.use("/api/sheets", sheetsRoutes);
    app.use("/api/igms", igmsRoutes);
    app.use("/api/pdf", pdfRoutes);
    app.use("/api/inventory", inventoryRoutes);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
