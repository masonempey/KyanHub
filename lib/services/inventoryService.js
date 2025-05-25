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

  static async autoGenerateInventory(
    propertyId,
    propertyName,
    month,
    year,
    monthNumber
  ) {
    try {
      console.log(
        `Auto-generating inventory for property ${propertyId} - ${propertyName}, ${month} ${year}`
      );

      // Create standard monthYear format for Google Drive folder
      const monthYear = `${month}${year}`;

      // SIMPLER APPROACH: Just directly query the database to find inventory
      // for this specific property AND month
      const inventoryResult = await pool.query(
        `SELECT i.*, p.name as product_name, p.owner_price, p.real_price 
         FROM inventory i
         JOIN products p ON i.product_id = p.id
         WHERE i.property_uid = $1 
         AND i.month = $2  -- Just the month name, not month+year
         AND i.quantity > 0`,
        [propertyId, month] // Just using 'month' instead of 'monthYear'
      );

      console.log(
        `Found ${inventoryResult.rows.length} inventory items with quantity > 0 for property ${propertyId} and month ${monthYear}`
      );

      // If no items found, just mark it as completed without generating a PDF
      if (inventoryResult.rows.length === 0) {
        console.log(
          `No inventory items found for ${propertyName}. Skipping PDF generation.`
        );

        // Generate a fake fileId for tracking
        const fileId = `AUTO-EMPTY-${Date.now()}`;

        // Just record this in the month-end tracking
        await pool.connect().then(async (client) => {
          try {
            const result = await client.query(
              `INSERT INTO property_month_end (
                property_id, property_name, year, month, month_number,
                inventory_invoice_generated, inventory_invoice_date, 
                inventory_invoice_id, inventory_total_amount
              ) VALUES (
                $1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, $6, $7
              ) 
              ON CONFLICT (property_id, year, month_number) 
              DO UPDATE SET
                inventory_invoice_generated = TRUE,
                inventory_invoice_date = CURRENT_TIMESTAMP,
                inventory_invoice_id = $6,
                inventory_total_amount = $7
              RETURNING *`,
              [propertyId, propertyName, year, month, monthNumber, fileId, 0]
            );

            return result.rows[0];
          } finally {
            client.release();
          }
        });

        return {
          success: true,
          inventoryId: fileId,
          webViewLink: null,
          totalAmount: 0,
          message: "No inventory items found. Marked as completed without PDF.",
          noItemsFound: true,
        };
      }

      // Map the inventory items to the format we need
      const itemsToInclude = inventoryResult.rows.map((item) => ({
        name: item.product_name,
        quantity: item.quantity,
        ownerPrice: parseFloat(item.owner_price) || 0,
      }));

      console.log(
        `Using ${itemsToInclude.length} items from inventory with quantity > 0`
      );

      // If no items at all, we should still continue but create an empty invoice
      if (itemsToInclude.length === 0) {
        console.log(
          "No inventory items with quantity found - creating empty invoice"
        );
      }

      // Create PDF document using jsPDF
      const { jsPDF } = require("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      // Format date for PDF
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      // Get end of next month for due date
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const lastDay = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth() + 1,
        0
      );
      const dueDate = lastDay.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      let totalBalance = 0;

      // Header
      doc.setFontSize(14);
      doc.text("KYAN Properties Ltd.", 20, 20);
      doc.setFontSize(12);
      doc.text("1917 10 Ave SW", 20, 25);
      doc.text("Calgary AB T3C 0J8", 20, 30);
      doc.text("Info@kyanproperties.com", 20, 35);

      // Invoice title
      doc.setFontSize(24);
      doc.setTextColor(236, 203, 52); // Using KYAN gold instead of blue
      doc.text("INVENTORY INVOICE", 20, 50);

      // Reset color
      doc.setTextColor(0, 0, 0);

      // Bill To
      doc.setFontSize(14);
      doc.text("Bill To:", 20, 60);
      doc.text(propertyName, 20, 65);

      // Property and dates
      doc.setFontSize(18);
      doc.text(propertyName, 20, 80);

      // Right aligned date info
      doc.setFontSize(14);
      doc.text("Date:", 170, 80, { align: "right" });
      doc.text(formattedDate, 170, 85, { align: "right" });
      doc.text("Period:", 170, 95, { align: "right" });
      doc.text(`${month} ${year}`, 170, 100, { align: "right" });

      // Table header
      const tableTop = 110;

      // Gold header background rectangle
      doc.setFillColor(236, 203, 52); // KYAN gold
      doc.rect(20, tableTop, 170, 8, "F");

      // Header text
      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51); // Dark text
      doc.text("Item", 22, tableTop + 5);
      doc.text("Qty", 80, tableTop + 5);
      doc.text("Rate", 120, tableTop + 5);
      doc.text("Amount", 150, tableTop + 5);

      let yPosition = tableTop + 15;
      const rowHeight = 8;
      let rowColor = true; // for alternating row colors

      // Auto-select a few default items that are typically used (example logic)
      const defaultItems = [
        { name: "Toilet Paper", quantity: 2 },
        { name: "Paper Towels", quantity: 1 },
        { name: "Dish Soap", quantity: 1 },
        { name: "Hand Soap", quantity: 1 },
        { name: "Laundry Detergent", quantity: 1 },
      ];

      // Collect data for Google Sheets
      const productDataForSheet = [];

      // Add default items to PDF
      itemsToInclude.forEach((item) => {
        const amount = item.quantity;
        const rate = item.ownerPrice;
        const rowTotal = amount * rate;
        totalBalance += rowTotal;

        // Row background (alternating colors)
        if (rowColor) {
          doc.setFillColor(245, 245, 245); // #f5f5f5
        } else {
          doc.setFillColor(255, 255, 255); // white
        }
        doc.rect(20, yPosition - 5, 170, rowHeight, "F");
        rowColor = !rowColor;

        // Row text
        doc.setTextColor(51, 51, 51);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(item.name, 22, yPosition);
        doc.text(amount.toString(), 80, yPosition);
        doc.text(`$${rate.toFixed(2)}`, 120, yPosition);
        doc.text(`$${rowTotal.toFixed(2)}`, 150, yPosition);

        yPosition += rowHeight + 2;

        // Add to data for sheet
        productDataForSheet.push({
          name: item.name,
          amount: amount,
          rate: rate,
          total: rowTotal,
        });
      });

      // Total - using the solid KYAN gold color
      yPosition += 5;
      doc.setFillColor(236, 203, 52); // KYAN gold - same as header
      doc.rect(20, yPosition - 5, 170, 10, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(51, 51, 51); // Dark text - same as content
      doc.text("Total Balance:", 120, yPosition);
      doc.text(`$${totalBalance.toFixed(2)}`, 150, yPosition);

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128); // Gray color
      doc.text(
        "This is an auto-generated inventory invoice.",
        105,
        pageHeight - 15,
        {
          align: "center",
        }
      );
      doc.text("KYAN Properties Ltd.", 105, pageHeight - 10, {
        align: "center",
      });

      // Convert the PDF to a buffer
      const pdfOutput = doc.output();
      const pdfBuffer = Buffer.from(pdfOutput, "binary");

      // Initialize Google services
      const googleService = require("@/lib/services/googleService");
      const PropertyService = require("@/lib/services/propertyService");
      await googleService.init();

      // Get folder ID and create folder structure
      const folderId = await PropertyService.getFolderID(propertyId);
      console.log(`Got folder ID for property: ${folderId}`);

      const receiptsFolderId = await googleService.findReceiptsSubfolder(
        folderId,
        monthYear
      );
      console.log(`Got receipts folder ID: ${receiptsFolderId}`);

      // Upload PDF to Google Drive with new naming pattern
      const { fileId, webViewLink } = await googleService.uploadPDF(
        pdfBuffer,
        `${propertyName}-Inventory-Invoice.pdf`, // Changed naming pattern
        receiptsFolderId
      );
      console.log(`Uploaded PDF to Google Drive: ${fileId}`);

      // Get Sheet ID and update Google Sheet
      const sheetId = await PropertyService.getClientSheetID(propertyId);
      console.log(`Got sheet ID for property: ${sheetId}`);

      if (sheetId) {
        // Now update the inventory values in Google Sheets with the PDF file ID
        await googleService.uploadInventoryInvoiceValues(sheetId, {
          month: month,
          products: productDataForSheet,
          totalCost: totalBalance,
          fileId: fileId,
        });
        console.log(`Updated Google Sheet with inventory data`);
      }

      // Record this in the month-end tracking
      await pool.connect().then(async (client) => {
        try {
          const result = await client.query(
            `INSERT INTO property_month_end (
              property_id, property_name, year, month, month_number,
              inventory_invoice_generated, inventory_invoice_date, 
              inventory_invoice_id, inventory_total_amount
            ) VALUES (
              $1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, $6, $7
            ) 
            ON CONFLICT (property_id, year, month_number) 
            DO UPDATE SET
              inventory_invoice_generated = TRUE,
              inventory_invoice_date = CURRENT_TIMESTAMP,
              inventory_invoice_id = $6,
              inventory_total_amount = $7
            RETURNING *`,
            [
              propertyId,
              propertyName,
              year,
              month,
              monthNumber,
              fileId,
              totalBalance,
            ]
          );

          return result.rows[0];
        } finally {
          client.release();
        }
      });

      return {
        success: true,
        inventoryId: fileId,
        webViewLink,
        totalAmount: totalBalance,
        message: "Auto-generated inventory with PDF and Google Sheet update",
      };
    } catch (error) {
      console.error("Error auto-generating inventory:", error);
      throw error;
    }
  }

  static async getProductsForProperty(propertyId) {
    try {
      // Get all products
      const productsResult = await pool.query(
        'SELECT id, name, owner_price, real_price FROM products ORDER BY "sort_order" ASC'
      );

      // Return products formatted for the property
      return productsResult.rows.map((product) => ({
        property_uid: propertyId,
        product_id: product.id,
        product_name: product.name,
        owner_price: product.owner_price,
        real_price: product.real_price,
        quantity: 0,
      }));
    } catch (error) {
      console.error("Error getting products for property:", error);
      throw error;
    }
  }
}

module.exports = InventoryService;
