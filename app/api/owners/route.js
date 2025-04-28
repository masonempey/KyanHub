import { NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { auth } from "@/lib/firebase/admin";

// Get all owners
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

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM property_owners ORDER BY name ASC`
      );
      return NextResponse.json({ success: true, owners: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching owners:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Create new owner
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

    const { name, email, phone, address, notes } = await request.json();

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
        `INSERT INTO property_owners 
         (name, email, phone, address, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, email, phone, address, notes]
      );

      return NextResponse.json(
        { success: true, owner: result.rows[0] },
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating owner:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
