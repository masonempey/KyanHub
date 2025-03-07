import { pool } from "@/lib/database";

class InventoryService {
  static async addProduct(name, price) {
    try {
      const result = await pool.query(
        `INSERT INTO products (name, price)
             VALUES ($1, $2)
             RETURNING *`,
        [name, price]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error adding product:", error);
      throw error;
    }
  }

  static async deleteProduct(productId) {
    try {
      const result = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING *",
        [productId]
      );

      if (result.rowCount === 0) {
        throw new Error("Product not found or already deleted");
      }

      console.log(`Product with ID ${productId} deleted successfully`);
      return result.rows[0];
    } catch (error) {
      console.error("Error deleting product:", error.message);
      throw error;
    }
  }
  static async getAllProducts() {
    try {
      const result = await pool.query("SELECT * FROM products");
      return result.rows;
    } catch (error) {
      console.error("Error getting products:", error);
      throw error;
    }
  }

  static async updateProduct(productId, name, price) {
    try {
      const result = await pool.query(
        `UPDATE products
             SET name = $1, price = $2
             WHERE id = $3
             RETURNING *`,
        [name, price, productId]
      );

      if (result.rowCount === 0) {
        throw new Error("Product not found");
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  static async getInventoryByProperty(propertyId, month) {
    try {
      console.log("Property ID:", propertyId);
      if (isNaN(propertyId)) {
        throw new Error("Invalid property ID");
      }

      const inventoryResult = await pool.query(
        `SELECT * FROM inventory WHERE property_uid = $1 AND month = $2`,
        [propertyId, month]
      );

      if (inventoryResult.rows.length > 0) {
        return inventoryResult.rows;
      } else {
        const productsResult = await pool.query(
          "SELECT id, name FROM products"
        );
        return productsResult.rows.map((product) => ({
          property_uid: propertyId,
          product_id: product.id,
          product_name: product.name,
          month: month,
          quantity: 0,
        }));
      }
    } catch (error) {
      console.error("Error getting inventory:", error);
      throw error;
    }
  }
}

module.exports = InventoryService;
