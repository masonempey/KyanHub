import { NextResponse } from "next/server";
import InventoryService from "@/lib/services/inventoryService";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month"), 10);
    const year = parseInt(searchParams.get("year"), 10);

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json(
        { error: "Valid month and year are required" },
        { status: 400 }
      );
    }

    const statuses = await InventoryService.getInventoryStatusesByMonth(
      month,
      year
    );

    return NextResponse.json({
      statuses,
    });
  } catch (error) {
    console.error("Error fetching inventory statuses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory statuses" },
      { status: 500 }
    );
  }
}
