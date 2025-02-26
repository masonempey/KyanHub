// app/api/maintenance/categories/route.js
import MaintenanceService from "@/lib/services/maintenanceService";

export async function GET() {
  try {
    console.log("Fetching categories");
    const categories = await MaintenanceService.getCategories();
    return new Response(JSON.stringify({ success: true, categories }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
