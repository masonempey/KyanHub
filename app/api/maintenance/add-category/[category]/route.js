// app/api/maintenance/add-category/[category]/route.js
import MaintenanceService from "@/lib/services/maintenanceService";

export async function POST(request, { params }) {
  try {
    const { category } = params;
    await MaintenanceService.insertCategory(category);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Category data inserted successfully",
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
