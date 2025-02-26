import InventoryService from "@/lib/services/inventoryService";

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const { propertyId, productId, month } = resolvedParams;
    const { quantity } = await request.json();

    if (!quantity || isNaN(quantity)) {
      return new Response("Quantity is required and must be a number", {
        status: 400,
      });
    }

    const updatedInventory = await InventoryService.addOrUpdateInventory(
      propertyId,
      productId,
      month,
      quantity
    );
    return new Response(JSON.stringify(updatedInventory), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "Error in PUT /inventory/[propertyId]/product/[productId]/[month]:",
      error
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { propertyId, productId, month } = params;
    const result = await InventoryService.deleteInventory(
      propertyId,
      productId,
      month
    ); // Assuming this method exists
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting inventory:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete inventory" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
