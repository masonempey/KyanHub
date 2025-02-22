const { google } = require("googleapis");
const googleService = require("../services/googleService");
const UserService = require("../services/userService");

const authMiddleware = async (req, res, next) => {
  try {
    if (req.path.startsWith("/api/google")) {
      return next();
    }

    const idToken = req.headers.authorization?.split("Bearer ")[1];

    if (!idToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const ticket = await googleService.getOAuth2Client().verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const user = await UserService.getUserByEmail(payload.email);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
