// app/api/google/auth-status/route.js
import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";

export async function GET() {
  try {
    // Check Google authentication status
    const authStatus = await googleService.init();

    return NextResponse.json(authStatus);
  } catch (error) {
    console.error("Error checking Google auth status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check auth status" },
      { status: 500 }
    );
  }
}
