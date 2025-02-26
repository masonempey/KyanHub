// app/api/maintenance/delete-category/[category]/route.js
import MaintenanceService from "@/lib/services/maintenanceService";

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const { category } = resolvedParams;
    await MaintenanceService.deleteCategory(category);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Category data deleted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting category data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
