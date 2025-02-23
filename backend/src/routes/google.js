const express = require("express");
const router = express.Router();
const googleService = require("../services/googleService");

router.get("/", async (req, res) => {
  try {
    const authUrl = googleService.getAuthUrl();
    console.log("Generated auth URL:", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).send("Authentication failed");
  }
});

router.get("/check-auth", async (req, res) => {
  try {
    await googleService.init();
    res.json({ authenticated: true });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  console.log("Received query:", req.query);
  console.log("Received code:", code);
  try {
    const tokens = await googleService.getTokens(code);
    console.log("Tokens:", tokens);
    res.send("Tokens fetched! Check your console.");
  } catch (error) {
    console.error("Error getting tokens:", error.response?.data || error);
    res.status(500).send("Something went wrong.");
  }
});

module.exports = router;
