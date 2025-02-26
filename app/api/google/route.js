// app/api/google/callback/route.js
import googleService from "@/lib/services/googleService";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  console.log("Received query:", searchParams);
  console.log("Received code:", code);

  try {
    const tokens = await googleService.getTokens(code);
    console.log("Tokens:", tokens);
    return new Response("Tokens fetched! Check your console.", { status: 200 });
  } catch (error) {
    console.error("Error getting tokens:", error.response?.data || error);
    return new Response("Something went wrong.", { status: 500 });
  }
}
