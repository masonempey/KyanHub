import { NextResponse } from "next/server";
import MonthEndService from "@/lib/services/monthEndService";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: "Month and year are required" },
        { status: 400 }
      );
    }

    const monthNumber = new Date(`${month} 1, ${year}`).getMonth() + 1;

    const reports = await MonthEndService.getCompletedReports(
      year,
      month,
      monthNumber
    );

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Error fetching completed reports:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
