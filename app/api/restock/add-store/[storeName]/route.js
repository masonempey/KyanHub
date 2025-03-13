// /api/restock/add-store/[storeName]/route.js
import InventoryService from "@/lib/services/inventoryService";

export async function POST(request, { params }) {
  try {
    // Get storeName from URL parameters
    const resolvedParams = await params;
    const { storeName } = resolvedParams;

    if (!storeName) {
      return new Response(
        JSON.stringify({ success: false, error: "Store name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const newStore = await InventoryService.addStore(storeName);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Store added successfully",
        store: newStore,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error adding store:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
