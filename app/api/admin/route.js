import { NextResponse } from "next/server";
import { checkRole } from "@/lib/middleware/checkRole";

export async function GET(request) {
  console.log("GET /api/admin - Starting admin check");
  try {
    const response = await checkRole(request, 1);
    return response;
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Admin check failed",
      },
      {
        status: 500,
      }
    );
  }
}
