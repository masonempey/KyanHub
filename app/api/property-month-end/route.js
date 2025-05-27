import { NextResponse } from "next/server";
import MonthEndService from "@/lib/services/monthEndService";

// Get month-end status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const year = parseInt(searchParams.get("year"), 10);
    const monthNumber = parseInt(searchParams.get("monthNumber"), 10);

    if (!propertyId || isNaN(year) || isNaN(monthNumber)) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const status = await MonthEndService.getMonthEndStatus(
      propertyId,
      year,
      monthNumber
    );

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error fetching month-end status:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Update month-end status
export async function POST(request) {
  try {
    const data = await request.json();
    const {
      propertyId,
      propertyName,
      year,
      month,
      monthNumber,
      statusType, // 'inventory', 'revenue', or 'email'
      statusData,
    } = data;

    if (
      !propertyId ||
      !propertyName ||
      !year ||
      !month ||
      !monthNumber ||
      !statusType
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    let result;

    switch (statusType) {
      case "inventory":
        result = await MonthEndService.updateInventoryStatus(
          propertyId,
          propertyName,
          year,
          month,
          monthNumber,
          statusData.invoiceId,
          statusData.totalAmount
        );
        break;
      case "revenue":
        result = await MonthEndService.updateRevenueStatus(
          propertyId,
          propertyName,
          year,
          month,
          monthNumber,
          statusData.revenueAmount,
          statusData.cleaningFeesAmount,
          statusData.expensesAmount,
          statusData.netAmount,
          statusData.bookingsCount,
          statusData.sheetId,
          statusData.ownerPercentage || 100 // Add this parameter
        );
        break;
      case "email":
        result = await MonthEndService.updateEmailStatus(
          propertyId,
          year,
          monthNumber,
          statusData.ownerId,
          statusData.ownerName,
          statusData.ownerProfit
        );
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Invalid status type" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error updating month-end status:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Validate if revenue can be updated
export async function OPTIONS(request) {
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
