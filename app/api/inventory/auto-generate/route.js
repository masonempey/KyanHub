import { NextResponse } from "next/server";
import InventoryService from "@/lib/services/inventoryService";

export async function POST(request) {
  try {
    const data = await request.json();
    const { propertyId, propertyName, month, year, monthNumber } = data;

    if (!propertyId || !propertyName || !month || !year || !monthNumber) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const result = await InventoryService.autoGenerateInventory(
      propertyId,
      propertyName,
      month,
      year,
      monthNumber
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error auto-generating inventory:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
