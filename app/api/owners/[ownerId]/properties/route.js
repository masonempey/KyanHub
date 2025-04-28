import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { auth } from "@/lib/firebase/admin";

// Get properties for owner
export async function GET(request, { params }) {
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

    const { ownerId } = params;

    const client = await pool.connect();
    try {
      // First verify the owner exists
      const ownerCheck = await client.query(
        `SELECT id FROM property_owners WHERE id = $1`,
        [ownerId]
      );

      if (ownerCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      // Get the properties associated with this owner
      const result = await client.query(
        `SELECT op.*, p.name as property_name 
         FROM owner_properties op
         JOIN properties p ON op.property_uid = p.property_uid
         WHERE op.owner_id = $1
         ORDER BY op.ownership_date DESC`,
        [ownerId]
      );

      return NextResponse.json({
        success: true,
        properties: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching owner properties:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Assign property to owner
export async function POST(request, { params }) {
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

    const { ownerId } = params;
    const { property_uid, ownership_percentage, ownership_date } =
      await request.json();

    // Basic validation
    if (!property_uid) {
      return NextResponse.json(
        { success: false, error: "Property ID is required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Verify owner exists
      const ownerCheck = await client.query(
        `SELECT id FROM property_owners WHERE id = $1`,
        [ownerId]
      );

      if (ownerCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      // Verify property exists
      const propertyCheck = await client.query(
        `SELECT property_uid FROM properties WHERE property_uid = $1`,
        [property_uid]
      );

      if (propertyCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Property not found" },
          { status: 404 }
        );
      }

      // Check for existing assignment
      const existingCheck = await client.query(
        `SELECT id FROM owner_properties 
         WHERE owner_id = $1 AND property_uid = $2`,
        [ownerId, property_uid]
      );

      if (existingCheck.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "This property is already assigned to this owner",
          },
          { status: 400 }
        );
      }

      // Create the assignment
      const result = await client.query(
        `INSERT INTO owner_properties 
         (owner_id, property_uid, ownership_percentage, ownership_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          ownerId,
          property_uid,
          ownership_percentage || 100,
          ownership_date || new Date().toISOString().split("T")[0],
        ]
      );

      return NextResponse.json(
        { success: true, property: result.rows[0] },
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error assigning property:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
