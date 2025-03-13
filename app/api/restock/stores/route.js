// /api/restock/stores
import InventoryService from "@/lib/services/inventoryService";

export async function GET(request) {
  try {
    // Fetch all stores from database
    console.log("GET request to /api/restock/stores");
    const storeData = await InventoryService.getAllStores();

    return new Response(JSON.stringify({ stores: storeData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching store data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
