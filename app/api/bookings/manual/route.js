import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import bookingService from "@/lib/services/bookingService";

export async function POST(request) {
  try {
    // Verify authentication (server-side)
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

    // Process booking data
    const data = await request.json();

    // Format data for the booking service
    const bookingData = {
      propertyId: data.propertyId,
      bookingCode: data.bookingCode || `MANUAL-${Date.now()}`,
      guestName: data.guestName,
      guestUid: data.guestUid || `manual-${Date.now()}`,
      platform: data.platform || "manual",
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      totalNights: data.totalNights,
      nightlyRate: data.nightlyRate,
      rawPriceData: { price_total: data.totalAmount },
      cleaningFee: data.cleaningFee || 0,
      cleaningFeeMonth: data.cleaningFeeMonth,
      nightsByMonth: data.nightsByMonth,
      revenueByMonth: data.revenueByMonth,
    };

    // Insert the booking
    await bookingService.insertBooking(bookingData);

    return NextResponse.json({
      success: true,
      message: "Manual booking created successfully",
      bookingCode: bookingData.bookingCode,
    });
  } catch (error) {
    console.error("Error creating manual booking:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
