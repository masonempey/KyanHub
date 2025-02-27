import admin from "firebase-admin";

let adminInstance;

try {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined");
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    adminInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized successfully");
  } else {
    adminInstance = admin.app();
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
  throw error;
}

export const auth = admin.auth();

export default adminInstance;
