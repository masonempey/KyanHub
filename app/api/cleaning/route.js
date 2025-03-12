// app/api/Cleaning/route.js
import CleaningService from "@/lib/services/cleaningService";

export async function POST(request) {
  try {
    const cleaningData = await request.json();
    await CleaningService.insertCleaning(cleaningData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cleaning data inserted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error inserting cleaning data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");

    if (!propertyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Property ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const maintenanceData = await CleaningService.getCleaningByProperty(
      propertyId
    );

    return new Response(JSON.stringify(maintenanceData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching cleaning data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const cleaningId = url.searchParams.get("id");

    if (!cleaningId) {
      return new Response(
        JSON.stringify({ success: false, error: "Cleaning ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Deleting cleaning with ID:", cleaningId); // Add this for debugging

    await CleaningService.deleteCleaning(cleaningId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cleaning record deleted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting cleaning record:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
