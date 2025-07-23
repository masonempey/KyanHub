import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import { pool } from "@/lib/database";
import MonthEndService from "@/lib/services/monthEndService";

export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await auth.verifyIdToken(token);
    } catch (authError) {
      console.error("Token verification failed:", authError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const propertyId of propertyIds) {
        try {
          // Get property name
          const propertyResult = await client.query(
            `SELECT name FROM properties WHERE property_uid = $1`,
            [propertyId]
          );

          const propertyName =
            propertyResult.rows.length > 0
              ? propertyResult.rows[0].name
              : `Property ${propertyId}`;

          // Check if record exists
          const existingRecord = await client.query(
            `SELECT id FROM property_month_end 
             WHERE property_id = $1 AND year = $2 AND month_number = $3`,
            [propertyId, year, month]
          );

          if (existingRecord.rows.length > 0) {
            // Update existing record
            await client.query(
              `UPDATE property_month_end SET
                status = $1,
                updated_at = CURRENT_TIMESTAMP
               WHERE property_id = $2 AND year = $3 AND month_number = $4`,
              [status, propertyId, year, month]
            );
          } else {
            // Get month name
            const monthNames = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            const monthName = monthNames[parseInt(month) - 1];

            // Insert new record
            await client.query(
              `INSERT INTO property_month_end (
                property_id, property_name, year, month, month_number, status, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
              )`,
              [propertyId, propertyName, year, monthName, month, status]
            );
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

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
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
