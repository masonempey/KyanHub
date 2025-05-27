import { NextResponse } from "next/server";
import PropertyService from "@/lib/services/propertyService";

export async function GET(request, { params }) {
  try {
    const { propertyId } = params;

    console.log(`Looking up ALL owners for property: ${propertyId}`);

    // Use the PropertyService to get all owners (not just the first one)
    const owners = await PropertyService.getAllOwnersForProperty(propertyId);

    if (!owners || owners.length === 0) {
      console.log(`No owners found for property ${propertyId}`);
      return NextResponse.json(
        { success: false, error: "No owners found for this property" },
        { status: 404 }
      );
    }

    console.log(`Found ${owners.length} owners for property ${propertyId}`);

    return NextResponse.json({
      success: true,
      owners: owners,
    });
  } catch (error) {
    console.error("Error fetching property owners:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
