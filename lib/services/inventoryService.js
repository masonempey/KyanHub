import { pool } from "@/lib/database";

class InventoryService {
  static async addProduct(name, ownerPrice, realPrice) {
    try {
      const result = await pool.query(
        `INSERT INTO products (name, owner_price, real_price, "sort_order")
         VALUES ($1, $2, $3, (SELECT COALESCE(MAX("sort_order"), -1) + 1 FROM products))
         RETURNING *`,
        [name, ownerPrice, realPrice]
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
      const result = await pool.query(
        'SELECT * FROM products ORDER BY "sort_order" ASC'
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting products:", error);
      throw error;
    }
  }

  static async updateProduct(productId, name, ownerPrice, realPrice) {
    try {
      const result = await pool.query(
        `UPDATE products
         SET name = $1, owner_price = $2, real_price = $3
         WHERE id = $4
         RETURNING *`,
        [name, ownerPrice, realPrice, productId]
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

  static async updateProductOrder(productsOrder) {
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const { productId, order } of productsOrder) {
          const result = await client.query(
            `UPDATE products
             SET "sort_order" = $1
             WHERE id = $2
             RETURNING *`,
            [order, productId]
          );

          if (result.rowCount === 0) {
            throw new Error(`Product with ID ${productId} not found`);
          }
        }

        await client.query("COMMIT");
        return { success: true };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating product order:", error);
      throw error;
    }
  }

  static async getProductPrices() {
    try {
      const result = await pool.query(
        `SELECT id, real_price FROM products ORDER BY "sort_order" ASC`
      );
      return result.rows.map((product) => ({
        product_id: product.id,
        price: product.real_price,
      }));
    } catch (error) {
      console.error("Error getting product prices:", error);
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
          'SELECT id, name, owner_price, real_price FROM products ORDER BY "sort_order" ASC'
        );
        return productsResult.rows.map((product) => ({
          property_uid: propertyId,
          product_id: product.id,
          product_name: product.name,
          owner_price: product.owner_price,
          real_price: product.real_price,
          month: month,
          quantity: 0,
        }));
      }
    } catch (error) {
      console.error("Error getting inventory:", error);
      throw error;
    }
  }

  static async addOrUpdateInventory(propertyId, productId, month, quantity) {
    try {
      console.log("Updating Product ID:", productId);
      const propertyCheck = await pool.query(
        `SELECT 1 FROM properties WHERE property_uid = $1`,
        [propertyId]
      );

      if (propertyCheck.rows.length === 0) {
        throw new Error(`Property ID ${propertyId} does not exist`);
      }

      // Check if product_id exists in products table
      const productCheck = await pool.query(
        `SELECT 1 FROM products WHERE id = $1`,
        [productId]
      );

      if (productCheck.rows.length === 0) {
        throw new Error(`Product ID ${productId} does not exist`);
      }

      if (quantity === 0) {
        const deleteResult = await pool.query(
          `DELETE FROM inventory 
           WHERE property_uid = $1 AND product_id = $2 AND month = $3
           RETURNING *`,
          [propertyId, productId, month]
        );

        // Check if anything was actually deleted
        if (deleteResult.rowCount > 0) {
          console.log(
            `Successfully deleted inventory item: Property ${propertyId}, Product ${productId}, Month ${month}`
          );
          return {
            deleted: true,
            product_id: productId,
            quantity: 0,
            property_uid: propertyId,
            month: month,
          };
        } else {
          console.log(
            `No inventory record found to delete for: Property ${propertyId}, Product ${productId}, Month ${month}`
          );
          return {
            deleted: false,
            not_found: true,
            product_id: productId,
            quantity: 0,
            property_uid: propertyId,
            month: month,
          };
        }
      } else {
        // Regular upsert for non-zero quantities
        const result = await pool.query(
          `INSERT INTO inventory (property_uid, product_id, month, quantity)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (property_uid, product_id, month)
           DO UPDATE SET quantity = EXCLUDED.quantity
           RETURNING *`,
          [propertyId, productId, month, quantity]
        );
        return result.rows[0];
      }
    } catch (error) {
      console.error("Error adding or updating inventory:", error);
      throw error;
    }
  }

  static async updateProductStock(itemsToRestock) {
    try {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const { productId, quantity } of itemsToRestock) {
          await client.query(
            `INSERT INTO product_stock (product_id, stock_quantity, last_updated)
             VALUES ($1, $2, NOW())
             ON CONFLICT (product_id) DO UPDATE
             SET stock_quantity = product_stock.stock_quantity + $2,
                 last_updated = NOW()`,
            [productId, quantity]
          );
        }

        await client.query("COMMIT");
        return { success: true };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating product stock:", error);
      throw error;
    }
  }

  static async getAllProductStock() {
    try {
      const result = await pool.query(
        `SELECT product_id, stock_quantity FROM product_stock`
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting product stock:", error);
      throw error;
    }
  }

  static async getAllStores() {
    try {
      const result = await pool.query("SELECT * FROM stores");
      return result.rows;
    } catch (error) {
      console.error("Error getting stores:", error);
      throw error;
    }
  }

  static async addStore(storeName) {
    try {
      const result = await pool.query(
        `INSERT INTO stores (store_name)
         VALUES ($1)
         RETURNING *`,
        [storeName]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error adding store:", error);
      throw error;
    }
  }

  static async deleteStore(storeName) {
    try {
      const result = await pool.query(
        "DELETE FROM stores WHERE store_name = $1 RETURNING *",
        [storeName]
      );

      if (result.rowCount === 0) {
        throw new Error("Store not found or already deleted");
      }

      console.log(`Store with storeName ${storeName} deleted successfully`);
      return result.rows[0];
    } catch (error) {
      console.error("Error deleting store:", error.message);
      throw error;
    }
  }
}

module.exports = InventoryService;
