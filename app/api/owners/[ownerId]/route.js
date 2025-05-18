import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import OwnerService from "@/lib/services/ownerService";

// Get owner by id
export async function GET(request, context) {
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

    const params = await context.params;
    const ownerId = params.ownerId;

    const owner = await OwnerService.getOwnerById(ownerId);

    if (!owner) {
      return NextResponse.json(
        { success: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, owner });
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
    const ownerData = await request.json();
    const { name } = ownerData;

    // Basic validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Owner name is required" },
        { status: 400 }
      );
    }

    const updatedOwner = await OwnerService.updateOwner(ownerId, ownerData);

    if (!updatedOwner) {
      return NextResponse.json(
        { success: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, owner: updatedOwner });
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
    const success = await OwnerService.deleteOwner(ownerId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Owner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Owner deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting owner:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
