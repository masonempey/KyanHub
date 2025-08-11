import { CognitoJwtVerifier } from "aws-jwt-verify";

// Create a verifier for Cognito user pool
const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.USER_POOL_CLIENT_ID,
});

// Helper function to verify Cognito token on the server
export const verifyAuthToken = async (token) => {
  if (!token) return null;

  try {
    const decodedToken = await jwtVerifier.verify(token);
    return decodedToken;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

// Simplified getServerSession equivalent for Cognito
export const getServerSession = async (req) => {
  const token = req.headers?.authorization?.split("Bearer ")[1];
  if (!token) return null;

  const user = await verifyAuthToken(token);
  return user ? { user } : null;
};
