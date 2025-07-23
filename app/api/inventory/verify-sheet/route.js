import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import googleService from "@/lib/services/googleService";
import PropertyService from "@/lib/services/propertyService";
import InventoryService from "@/lib/services/inventoryService";

export async function GET(request) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const month = parseInt(searchParams.get("month"), 10);
    const year = parseInt(searchParams.get("year"), 10);

    if (!propertyId || isNaN(month) || isNaN(year)) {
      return NextResponse.json(
        { error: "PropertyId, month, and year are required" },
        { status: 400 }
      );
    }

    // Get invoice details from database
    const invoiceDetails = await InventoryService.getInventoryInvoiceDetails(
      propertyId,
      month,
      year
    );

    if (!invoiceDetails || !invoiceDetails.fileId) {
      return NextResponse.json({ exists: false });
    }

    // Get Google Sheet ID for the property
    const sheetId = await PropertyService.getClientSheetID(propertyId);
    if (!sheetId) {
      return NextResponse.json({ exists: false, error: "Sheet ID not found" });
    }

    // Initialize Google service
    await googleService.init();

    // Check if the invoice entry exists in the sheet
    const exists = await InventoryService.verifyInvoiceInSheet(
      sheetId,
      invoiceDetails.fileId
    );

    return NextResponse.json({
      exists,
      invoiceId: invoiceDetails.fileId,
    });
  } catch (error) {
    console.error("Error verifying sheet entry:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify sheet entry" },
      { status: 500 }
    );
  }
}
