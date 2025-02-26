// app/api/inventory/[propertyId]/[month]/route.js
import InventoryService from "@/lib/services/inventoryService";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { propertyId, month } = resolvedParams;
    console.log(
      `Fetching inventory for property: ${propertyId}, month: ${month}`
    );

    const inventory = await InventoryService.getInventoryByProperty(
      propertyId,
      month
    );
    if (!inventory) {
      return new Response(
        JSON.stringify({ error: "Property inventory not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(inventory), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch inventory" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
