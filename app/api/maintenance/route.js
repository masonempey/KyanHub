// app/api/maintenance/route.js
import MaintenanceService from "@/lib/services/maintenanceService";

export async function POST(request) {
  try {
    const maintenanceData = await request.json();
    await MaintenanceService.insertMaintenance(maintenanceData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Maintenance data inserted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error inserting maintenance data:", error);
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

    const maintenanceData = await MaintenanceService.getMaintenanceByProperty(
      propertyId
    );

    return new Response(JSON.stringify(maintenanceData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching maintenance data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const maintenanceId = url.searchParams.get("id");

    if (!maintenanceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Maintenance ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await MaintenanceService.deleteMaintenance(maintenanceId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Maintenance data deleted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting maintenance data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
