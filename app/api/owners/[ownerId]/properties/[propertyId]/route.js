import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { auth } from "@/lib/firebase/admin";

// Delete property assignment
export async function DELETE(request, { params }) {
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

    const { ownerId, propertyId } = params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM owner_properties 
         WHERE owner_id = $1 AND property_uid = $2
         RETURNING id`,
        [ownerId, propertyId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Property assignment not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Property assignment removed successfully",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error removing property assignment:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
