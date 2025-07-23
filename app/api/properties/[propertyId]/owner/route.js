import { NextResponse } from "next/server";
import PropertyService from "@/lib/services/propertyService";
import OwnerService from "@/lib/services/ownerService";
import { query } from "@/lib/database";

export async function GET(request, { params }) {
  try {
    // Await params before destructuring
    const resolvedParams = await params;
    const { propertyId } = resolvedParams;

    console.log(`Looking up owner for property: ${propertyId}`);

    // First, check directly in owner_properties table
    const ownerProperty = await query(
      `SELECT op.*, p.name as property_name, o.name as owner_name, o.email, o.id, o.template_id
       FROM owner_properties op
       JOIN properties p ON op.property_uid = p.property_uid
       JOIN property_owners o ON op.owner_id = o.id
       WHERE op.property_uid = $1
       LIMIT 1`,
      [propertyId]
    );

    if (ownerProperty.rows.length > 0) {
      const owner = ownerProperty.rows[0];
      console.log(
        `Found owner (${owner.owner_name}) for property ${propertyId} with ${owner.ownership_percentage}% ownership`
      );

      return NextResponse.json({
        success: true,
        owner: {
          id: owner.id,
          name: owner.owner_name,
          email: owner.email,
          template_id: owner.template_id,
          ownership_percentage: owner.ownership_percentage,
        },
      });
    }

    // Fall back to using the PropertyService if direct query fails
    console.log(`No owner found in direct query, trying PropertyService...`);
    const ownerPropertyFromService = await PropertyService.getPropertyOwner(
      propertyId
    );

    if (!ownerPropertyFromService) {
      console.log(`No owner association found for property ${propertyId}`);
      return NextResponse.json(
        { success: false, error: "No owner found for this property" },
        { status: 404 }
      );
    }

    // Get the full owner details
    const owner = await OwnerService.getOwnerById(
      ownerPropertyFromService.owner_id
    );

    if (!owner) {
      console.log(
        `Owner ID ${ownerPropertyFromService.owner_id} not found in database`
      );
      return NextResponse.json(
        { success: false, error: "Owner record not found" },
        { status: 404 }
      );
    }

    console.log(`Found owner (${owner.name}) using service method`);
    return NextResponse.json({
      success: true,
      owner: {
        ...owner,
        ownership_percentage: ownerPropertyFromService.ownership_percentage,
      },
    });
  } catch (error) {
    console.error("Error fetching property owner:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
