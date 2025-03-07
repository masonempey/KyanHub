// app/api/inventory/[propertyId]/[month]/route.js
import { NextResponse } from "next/server";
const InventoryService = require("@/lib/services/inventoryService");

// For fetching inventory
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { propertyId, month } = resolvedParams;

    console.log("Fetching inventory:", { propertyId, month });

    if (!propertyId || !month) {
      return NextResponse.json(
        { error: "Property ID and month are required" },
        { status: 400 }
      );
    }

    const inventoryItems = await InventoryService.getInventoryByProperty(
      propertyId,
      month
    );

    return NextResponse.json(inventoryItems);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
