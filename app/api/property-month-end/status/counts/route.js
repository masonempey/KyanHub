//app/api/property-month-end/status/counts/route.js
import { NextResponse } from "next/server";
import MonthEndService from "@/lib/services/monthEndService";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year"), 10);
    const monthNumber = parseInt(searchParams.get("monthNumber"), 10);

    if (isNaN(year) || isNaN(monthNumber)) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const counts = await MonthEndService.getStatusCounts(year, monthNumber);

    return NextResponse.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    console.error("Error fetching status counts:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
