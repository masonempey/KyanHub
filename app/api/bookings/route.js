import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import BookingService from "@/lib/services/bookingService";

export async function GET(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      await auth.verifyIdToken(token);
    } catch (e) {
      console.error("Auth verification error:", e);
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      propertyId: searchParams.get("propertyId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      bookingCode: searchParams.get("bookingCode"),
      guestName: searchParams.get("guestName"),
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
    };

    // Get total count and paginated bookings
    const { bookings, totalCount } = await BookingService.searchBookings(
      filters
    );

    return NextResponse.json({
      success: true,
      bookings,
      page: filters.page,
      pageSize: filters.pageSize,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
