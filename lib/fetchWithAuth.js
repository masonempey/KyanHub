import { fetchAuthSession } from "aws-amplify/auth";

export default async function fetchWithAuth(url, options = {}) {
  try {
    // Get session and JWT token from Cognito
    const { tokens } = await fetchAuthSession();
    const token = tokens.idToken.toString();

    // Add the token to request headers
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    return fetch(url, { ...options, headers });
  } catch (error) {
    console.error("Error in fetchWithAuth:", error);
    return Promise.reject(error);
  }
}
