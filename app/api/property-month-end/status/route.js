import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import MonthEndService from "@/lib/services/monthEndService";

// Update status for a single property
export async function PUT(request) {
  try {
    // Extract token from Authorization header
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse the request body
    const data = await request.json();
    const { propertyId, year, monthNumber, status } = data;

    // Validate required fields
    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    if (monthNumber === undefined || monthNumber === null) {
      return NextResponse.json(
        { error: "Month number is required" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Update the status
    const result = await MonthEndService.updateMonthEndStatus(
      propertyId,
      year,
      monthNumber,
      status
    );

    return NextResponse.json({
      success: true,
      message: `Status updated to '${status}' successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}

// Get properties by status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year"), 10);
    const monthNumber = parseInt(searchParams.get("monthNumber"), 10);
    const status = searchParams.get("status");

    if (!year || !monthNumber || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const properties = await MonthEndService.getPropertiesByStatus(
      year,
      monthNumber,
      status
    );

    return NextResponse.json({ success: true, data: properties });
  } catch (error) {
    console.error("Error fetching properties by status:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Batch update status
export async function PATCH(request) {
  try {
    const data = await request.json();
    const { propertyIds, year, monthNumber, status } = data;

    // Validate auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const results = await MonthEndService.batchUpdateStatus(
      propertyIds,
      year,
      monthNumber,
      status,
      userId
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error updating status batch:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
