// app/api/Properties/[propertyID]/route.js
import PropertyService from "@/lib/services/propertyService";

export async function PATCH(request, { params }) {
  try {
    const resolvedParams = await params;
    const { propertyId } = resolvedParams;
    if (!propertyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Property ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const propertyData = await request.json();
    await PropertyService.updateProperty(propertyId, propertyData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Property updated successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating property:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { propertyId } = resolvedParams;

    if (!propertyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Property ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const propertyDetails = await PropertyService.getPropertyById(propertyId);

    return new Response(JSON.stringify({ success: true, ...propertyDetails }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching property details:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
