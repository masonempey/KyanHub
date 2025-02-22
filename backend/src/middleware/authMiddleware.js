const admin = require("./firebaseAdmin");
const UserService = require("../services/userService");

const authMiddleware = async (req, res, next) => {
  try {
    if (req.path.startsWith("/api/google")) {
      return next();
    }

    const idToken = req.headers.authorization?.split("Bearer ")[1];
    console.log("Received token:", idToken);

    if (!idToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("Decoded token:", decodedToken);

    const user = await UserService.getUserByEmail(decodedToken.email);
    console.log("User:", user);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
