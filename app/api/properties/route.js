import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { auth } from "@/lib/firebase/admin";

export async function GET(request) {
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

    // Query all properties from database
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          property_uid, 
          name, 
          address, 
          bedrooms, 
          bathrooms, 
          sqft, 
          google_sheet_id, 
          google_folder_id,
          property_type
        FROM properties
        ORDER BY name ASC
      `);

      // Transform into key-value object for easier use in frontend
      const properties = result.rows.reduce((acc, property) => {
        acc[property.property_uid] = {
          name: property.name,
          address: property.address || "",
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          sqft: property.sqft,
          google_sheet_id: property.google_sheet_id,
          google_folder_id: property.google_folder_id,
          property_type: property.property_type,
        };
        return acc;
      }, {});

      return NextResponse.json({
        success: true,
        properties,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
