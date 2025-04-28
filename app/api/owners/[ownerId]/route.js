import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { auth } from "@/lib/firebase/admin";

// Get owner by id
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
      const result = await client.query(
        `SELECT * FROM property_owners WHERE id = $1`,
        [ownerId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, owner: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching owner:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Update owner
export async function PUT(request, { params }) {
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
    const { name, email, phone, address, notes, date_added } =
      await request.json();

    // Basic validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Owner name is required" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE property_owners
         SET name = $1, email = $2, phone = $3, address = $4, notes = $5, 
             date_added = $6
         WHERE id = $7
         RETURNING *`,
        [name, email, phone, address, notes, date_added, ownerId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, owner: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating owner:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Delete owner
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

    const { ownerId } = params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM property_owners WHERE id = $1 RETURNING id`,
        [ownerId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Owner deleted successfully",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error deleting owner:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
