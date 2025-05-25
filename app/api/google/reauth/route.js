import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";
import { auth } from "@/lib/firebase/admin";

export async function GET(request) {
  try {
    // Verify authentication if needed
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (token) {
      try {
        await auth.verifyIdToken(token);
      } catch (authError) {
        console.error("Firebase token verification failed:", authError);
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
    }

    // Generate a new auth URL with all required scopes
    const authUrl = googleService.getAuthUrl(true); // Pass true to force all scopes
    console.log("Generated new auth URL with all scopes:", authUrl);

    return NextResponse.json({
      authUrl,
      message: "Authorization URL generated. Redirect the user to this URL.",
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
