import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import OwnerService from "@/lib/services/ownerService";

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

    try {
      const properties = await OwnerService.getOwnerProperties(ownerId);
      return NextResponse.json({ success: true, properties });
    } catch (error) {
      if (error.message === "Owner not found") {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      }
      throw error;
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

    try {
      const property = await OwnerService.assignProperty(
        ownerId,
        property_uid,
        ownership_percentage,
        ownership_date
      );

      return NextResponse.json({ success: true, property }, { status: 201 });
    } catch (error) {
      if (error.message === "Owner not found") {
        return NextResponse.json(
          { success: false, error: "Owner not found" },
          { status: 404 }
        );
      } else if (error.message === "Property not found") {
        return NextResponse.json(
          { success: false, error: "Property not found" },
          { status: 404 }
        );
      } else if (error.message.includes("already assigned")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error assigning property:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Remove property from owner
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

    const success = await OwnerService.removeProperty(ownerId, propertyId);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Property not found or not assigned to this owner",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Property removed from owner successfully",
    });
  } catch (error) {
    console.error("Error removing property:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
