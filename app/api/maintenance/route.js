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
