// app/api/maintenance/delete-company/[companyName]/route.js
import MaintenanceService from "@/lib/services/maintenanceService";

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const { companyName } = resolvedParams;
    await MaintenanceService.deleteCompany(companyName);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Company data deleted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting company data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
