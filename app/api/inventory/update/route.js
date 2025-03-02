import InventoryService from "@/lib/services/inventoryService";
import { NextResponse } from "next/server";

export async function PUT(request) {
  try {
    const data = await request.json();
    const { propertyId, productId, month, quantity } = data;

    console.log("Processing inventory update:", {
      propertyId,
      productId,
      month,
      quantity,
    });

    if (isNaN(quantity)) {
      return NextResponse.json(
        { error: "Quantity must be a number" },
        { status: 400 }
      );
    }

    const updatedInventory = await InventoryService.addOrUpdateInventory(
      propertyId,
      productId,
      month,
      quantity
    );

    return NextResponse.json(updatedInventory);
  } catch (error) {
    console.error("Error updating inventory:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update inventory" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { propertyId, month } = params;

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
