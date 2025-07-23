import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import googleService from "@/lib/services/googleService";
import InventoryService from "@/lib/services/inventoryService";

export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await auth.verifyIdToken(token);
    } catch (authError) {
      console.error("Token verification failed:", authError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse the request body
    const { propertyId, month, year } = await request.json();

    if (!propertyId || !month || !year) {
      return NextResponse.json(
        { error: "Property ID, month, and year are required" },
        { status: 400 }
      );
    }

    // Use the inventory service to reset the status
    const result = await InventoryService.resetInventoryInvoiceStatus(
      propertyId,
      month,
      year
    );

    return NextResponse.json({
      success: true,
      message: "Invoice status reset successfully",
      cleanup: result.cleanup,
    });
  } catch (error) {
    console.error("Error resetting invoice status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset invoice status" },
      { status: 500 }
    );
  }
}
