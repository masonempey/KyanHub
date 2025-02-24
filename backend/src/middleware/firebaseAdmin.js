const admin = require("firebase-admin");

let serviceAccount;

try {
  // Parse the service account key from the environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (error) {
  console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error);
  throw new Error(
    "Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it’s a valid JSON string."
  );
}

// Only initialize if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error;
  }
}

module.exports = admin;
