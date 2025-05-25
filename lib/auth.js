import { auth as firebaseAuth } from "./firebase/admin";

// Export auth options and utility functions for server components
export const authOptions = {
  // Using Firebase Auth directly, so no NextAuth-specific providers
  providers: [],

  // We're not using NextAuth sessions, this is just to satisfy the API structure
  callbacks: {
    async session({ session, token }) {
      return session;
    },
  },
};

// Helper function to verify Firebase token on the server
export const verifyAuthToken = async (token) => {
  if (!token) return null;

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

// Simplified getServerSession equivalent for Firebase
export const getServerSession = async (req) => {
  const token = req.headers?.authorization?.split("Bearer ")[1];
  if (!token) return null;

  const user = await verifyAuthToken(token);
  return user ? { user } : null;
};
