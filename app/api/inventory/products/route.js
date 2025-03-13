import InventoryService from "@/lib/services/inventoryService";

export async function GET() {
  try {
    const products = await InventoryService.getAllProducts();
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request) {
  try {
    const { name, owner_price, real_price } = await request.json();
    if (!name) {
      return new Response("Product name is required", { status: 400 });
    }

    const ownerPrice = owner_price ? parseFloat(owner_price) : null;
    const realPrice = real_price ? parseFloat(real_price) : null;

    if (
      (owner_price && isNaN(ownerPrice)) ||
      (real_price && isNaN(realPrice))
    ) {
      return new Response("Prices must be valid numbers", { status: 400 });
    }

    const newProduct = await InventoryService.addProduct(
      name,
      ownerPrice,
      realPrice
    );
    return new Response(JSON.stringify(newProduct), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /products:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    // Check if this is an order update request
    if (Array.isArray(body.products)) {
      const productsOrder = body.products.map(({ productId, order }) => ({
        productId,
        order: parseInt(order, 10),
      }));

      if (
        productsOrder.some(({ productId, order }) => !productId || isNaN(order))
      ) {
        return new Response(
          "Invalid product order data: productId and order are required",
          { status: 400 }
        );
      }

      await InventoryService.updateProductOrder(productsOrder);
      return new Response(
        JSON.stringify({ message: "Product order updated successfully" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Existing product update logic
    const { productId, name, owner_price, real_price } = body;
    if (!productId || !name) {
      return new Response("Product ID and name are required", {
        status: 400,
      });
    }

    const ownerPrice = owner_price ? parseFloat(owner_price) : null;
    const realPrice = real_price ? parseFloat(real_price) : null;

    if (
      (owner_price && isNaN(ownerPrice)) ||
      (real_price && isNaN(realPrice))
    ) {
      return new Response("Prices must be valid numbers", { status: 400 });
    }

    const updatedProduct = await InventoryService.updateProduct(
      productId,
      name,
      ownerPrice,
      realPrice
    );

    if (!updatedProduct) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(updatedProduct), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return new Response(JSON.stringify({ error: "Failed to update product" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const deletedProduct = await InventoryService.deleteProduct(productId);
    if (!deletedProduct) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(deletedProduct), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return new Response(JSON.stringify({ error: "Failed to delete product" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
