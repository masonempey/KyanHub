// app/api/maintenance/add-company/[companyName]/route.js
import MaintenanceService from "@/lib/services/maintenanceService";

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const { companyName } = resolvedParams;
    await MaintenanceService.insertCompany(companyName);
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
