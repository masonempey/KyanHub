import { auth } from "@/lib/firebase/client";

export default async function fetchWithAuth(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const token = await user.getIdToken();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  return fetch(url, { ...options, headers });
}
