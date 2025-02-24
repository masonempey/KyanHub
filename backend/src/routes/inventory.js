const express = require("express");
const router = express.Router();
const InventoryService = require("../services/inventoryService");

// Get all products
router.get("/products", async (req, res) => {
  try {
    const products = await InventoryService.getAllProducts();
    console.log("Products fetched:", products);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Add a new product
router.post("/products", async (req, res) => {
  try {
    const { name, price } = req.body;

    if (!name || !price || isNaN(price)) {
      return res.status(400).send("Name and price are required");
    }

    const newProduct = await InventoryService.addProduct(name, price);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error in POST /products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a product from the product list
router.delete("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const deletedProduct = await InventoryService.deleteProduct(productId);

    if (!deletedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(deletedProduct);
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Get inventory for a specific property and month
router.get("/:propertyId/:month", async (req, res) => {
  try {
    const { propertyId, month } = req.params;
    console.log(
      `Fetching inventory for property: ${propertyId}, month: ${month}`
    );

    const inventory = await InventoryService.getInventoryByProperty(
      propertyId,
      month
    );
    if (!inventory) {
      return res.status(404).json({ error: "Property inventory not found" });
    }

    res.status(200).json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Add or update inventory for a property and month
router.put("/:propertyId/:productId/:month", async (req, res) => {
  try {
    const { propertyId, productId, month } = req.params;
    const { quantity } = req.body;

    if (!quantity || isNaN(quantity)) {
      return res.status(400).send("Quantity is required and must be a number");
    }

    const updatedInventory = await InventoryService.addOrUpdateInventory(
      propertyId,
      productId,
      month,
      quantity
    );
    res.status(200).json(updatedInventory);
  } catch (error) {
    console.error(
      "Error in PUT /:propertyId/:productId/:quanitity/:month:",
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove an inventory item from a property
router.delete("/:propertyId/:productId/:month", async (req, res) => {
  try {
  } catch (error) {}
});

module.exports = router;
