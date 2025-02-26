// app/api/google/route.js
import googleService from "@/lib/services/googleService";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || ""; // Simulate Express-like routing

  try {
    if (path === "check-auth") {
      await googleService.init();
      return new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      const authUrl = googleService.getAuthUrl();
      console.log("Generated auth URL:", authUrl);
      return Response.redirect(authUrl);
    }
  } catch (error) {
    console.error("Auth error:", error);
    return new Response("Authentication failed", { status: 500 });
  }
}
