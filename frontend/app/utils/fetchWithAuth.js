import { auth } from "../firebase/config";

const fetchWithAuth = async (url, options = {}) => {
  const idToken = await auth.currentUser?.getIdToken();
  console.log("Sending request with token:", idToken);
  if (!idToken) throw new Error("No authentication token available");
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
  return fetch(url, { ...options, headers });
};

export default fetchWithAuth;
