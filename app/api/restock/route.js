// In /api/restock.js (or wherever your API route is)
import InventoryService from "@/lib/services/inventoryService";

export async function POST(request, { params }) {
  try {
    // Get items from request body
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid items" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await InventoryService.updateProductStock(items);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Restock submitted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in restock API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
