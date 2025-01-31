const { google } = require("googleapis");
const dotenv = require("dotenv");

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/api/google/callback"
);

// Only sheets readonly scope
const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

// Basic sheets setup
const sheets = google.sheets({
  version: "v4",
  auth: oauth2Client,
});

module.exports = { oauth2Client, scopes, sheets };
