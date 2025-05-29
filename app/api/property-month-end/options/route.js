import { NextResponse } from "next/server";
import MonthEndService from "@/lib/services/monthEndService";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const year = parseInt(searchParams.get("year"), 10);
    const monthNumber = parseInt(searchParams.get("monthNumber"), 10);
    const autoInventory = searchParams.get("autoInventory") === "true";

    if (!propertyId || isNaN(year) || isNaN(monthNumber)) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const validation = await MonthEndService.validateRevenueUpdate(
      propertyId,
      year,
      monthNumber,
      autoInventory
    );

    return NextResponse.json({
      success: true,
      ...validation,
    });
  } catch (error) {
    console.error("Error validating revenue update:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
