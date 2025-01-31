const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const googleRoutes = require("./src/routes/google");
const igmsRoutes = require("./src/routes/igms");
const pdfRoutes = require("./src/routes/pdf");
const authMiddleware = require("./src/middleware/authMiddleware");
const sheetsRoutes = require("./src/routes/sheets");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/google", googleRoutes);

// Routes
app.use("/api", authMiddleware);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/igms", igmsRoutes);
app.use("/api/pdf", pdfRoutes);

app.get("/", (req, res) => {
  res.send("Server running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
