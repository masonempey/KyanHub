import InventoryService from "@/lib/services/inventoryService";

export async function DELETE(request, { params }) {
  try {
    // Get storeName from URL path parameter
    const resolvedParams = await params;
    const { storeName } = resolvedParams;

    if (!storeName) {
      return new Response(
        JSON.stringify({ success: false, error: "Store name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use storeName to delete the store
    await InventoryService.deleteStore(storeName);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Store deleted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting store:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
