import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    // Verify authentication
    const session = await verifyAuth(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { propertyIds, year, month, status } = body;

    if (
      !propertyIds ||
      !Array.isArray(propertyIds) ||
      !year ||
      !month ||
      !status
    ) {
      return NextResponse.json(
        { error: "Property IDs array, year, month, and status are required" },
        { status: 400 }
      );
    }

    // Valid statuses
    const validStatuses = ["draft", "ready", "complete"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be draft, ready, or complete" },
        { status: 400 }
      );
    }

    // Process each property and track results
    const results = [];

    for (const propertyId of propertyIds) {
      try {
        // Check if month-end record exists
        const existingRecord = await prisma.monthEnd.findFirst({
          where: {
            propertyId,
            year: parseInt(year),
            month: parseInt(month),
          },
        });

        if (existingRecord) {
          // Update existing record
          await prisma.monthEnd.update({
            where: { id: existingRecord.id },
            data: { status },
          });
        } else {
          // Create new record
          await prisma.monthEnd.create({
            data: {
              propertyId,
              year: parseInt(year),
              month: parseInt(month),
              status,
              revenue: 0,
              bookingCount: 0,
            },
          });
        }

        results.push({
          propertyId,
          success: true,
        });
      } catch (error) {
        console.error(`Error updating property ${propertyId}:`, error);
        results.push({
          propertyId,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error processing batch update:", error);
    return NextResponse.json(
      { error: "Failed to process batch update" },
      { status: 500 }
    );
  }
}
