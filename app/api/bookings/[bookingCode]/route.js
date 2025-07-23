import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import BookingService from "@/lib/services/bookingService";

export async function PUT(request, { params }) {
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

    const resolvedParams = await params;
    const { bookingCode } = resolvedParams;
    const data = await request.json();

    // Use the service to update the booking
    await BookingService.updateBooking(bookingCode, data);

    return NextResponse.json({
      success: true,
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
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

    const resolvedParams = await params;
    const { bookingCode } = resolvedParams;

    // Use the service to get the booking
    const booking = await BookingService.getBookingByCode(bookingCode);

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    const resolvedParams = await params;
    const { bookingCode } = resolvedParams;

    // Use the service to delete the booking
    await BookingService.deleteBooking(bookingCode);

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
