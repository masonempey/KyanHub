const googleService = require("../services/googleService");

const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth check for Google OAuth routes
    if (req.path.startsWith("/api/google")) {
      return next();
    }

    // Check if we have valid credentials
    await googleService.init();
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
      redirectUrl: "/api/google",
    });
  }
};

module.exports = authMiddleware;
