// app/api/maintenance/add-company/route.js
import MaintenanceService from "@/lib/services/maintenanceService";

export async function POST(request, { params }) {
  try {
    const { companyName, googleFolderId } = await request.json();
    await MaintenanceService.insertCompany(companyName, googleFolderId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company data inserted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error inserting company data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
