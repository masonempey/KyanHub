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

    // If checking for email sending capability
    if (searchParams.get("checkEmail") === "true") {
      const status = await MonthEndService.getMonthEndStatus(
        propertyId,
        year,
        monthNumber
      );

      // Can only send email if revenue has been updated
      if (!status || !status.revenue_updated) {
        return NextResponse.json({
          canSendEmail: false,
          message: "Revenue must be updated before sending owner email",
        });
      }

      // Already sent email
      if (status.owner_email_sent) {
        return NextResponse.json({
          canSendEmail: false,
          message: "Owner email has already been sent",
        });
      }

      return NextResponse.json({
        canSendEmail: true,
        message: "Ready to send owner email",
      });
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
