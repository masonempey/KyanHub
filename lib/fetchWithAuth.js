import { auth } from "@/lib/firebase/client";

export default async function fetchWithAuth(url, options = {}) {
  const user = auth.currentUser;

  // Return a rejected promise instead of throwing, makes error handling cleaner
  if (!user) {
    return Promise.reject(new Error("No authenticated user"));
  }

  try {
    const token = await user.getIdToken();
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
