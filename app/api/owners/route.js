import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import OwnerService from "@/lib/services/ownerService";

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

    const owners = await OwnerService.getAllOwners();
    return NextResponse.json({ success: true, owners });
  } catch (error) {
    console.error("Error fetching owners:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Create a new owner
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

    const ownerData = await request.json();
    const { name } = ownerData;

    // Basic validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Owner name is required" },
        { status: 400 }
      );
    }

    const newOwner = await OwnerService.createOwner(ownerData);

    return NextResponse.json(
      { success: true, owner: newOwner },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating owner:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
