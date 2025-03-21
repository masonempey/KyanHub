import InventoryService from "@/lib/services/inventoryService";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Get the inventory data from your service
    const inventoryData = await InventoryService.getAllProductStock();

    console.log(inventoryData);

    if (!inventoryData || !Array.isArray(inventoryData)) {
      return NextResponse.json(
        { success: false, error: "Invalid inventory data" },
        { status: 500 }
      );
    }

    const products = await InventoryService.getAllProducts();

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { success: false, error: "Invalid products data" },
        { status: 500 }
      );
    }

    // Combine the inventory data with the product data
    const productsWithQuantities = products.map((product) => {
      const inventoryItem = inventoryData.find(
        (item) => item.product_id === product.id
      );

      return {
        ...product,
        quantity: inventoryItem ? inventoryItem.stock_quantity : 0,
      };
    });

    console.log(productsWithQuantities);

    return NextResponse.json({
      success: true,
      products: productsWithQuantities,
      totalProducts: productsWithQuantities.length,
    });
  } catch (error) {
    console.error("Error fetching inventory levels:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch inventory data",
      },
      { status: 500 }
    );
  }
}
