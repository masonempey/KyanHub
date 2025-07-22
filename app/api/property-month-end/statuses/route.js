import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin"; // Import auth directly from Firebase admin
import MonthEndService from "@/lib/services/monthEndService";
import PropertyService from "@/lib/services/propertyService";

export async function GET(request) {
  try {
    // Extract token from Authorization header
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token
    try {
      await auth.verifyIdToken(token);
    } catch (authError) {
      console.error("Token verification failed:", authError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month are required" },
        { status: 400 }
      );
    }

    // Get all property statuses for the month/year
    const properties = await MonthEndService.getAllPropertyStatuses(
      parseInt(year),
      parseInt(month)
    );

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error fetching property statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch property statuses" },
      { status: 500 }
    );
  }
}
