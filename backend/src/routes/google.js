const express = require("express");
const router = express.Router();
const googleService = require("../services/googleService");

router.get("/", async (req, res) => {
  try {
    const authUrl = await googleService.generateAuthUrl();
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
  try {
    const { code } = req.query;
    await googleService.handleCallback(code);
    res.redirect("http://localhost:3000/add"); // Redirect to frontend
  } catch (error) {
    console.error("Callback error:", error);
    res.redirect("http://localhost:3000/error");
  }
});

module.exports = router;
