import { pool } from "@/lib/database";

class InvoiceService {
  static async saveInvoiceData({
    fileId,
    fileName,
    extractedData,
    processedAt,
  }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Save the main invoice record
      const invoiceResult = await client.query(
        `INSERT INTO invoices (
          file_id, 
          file_name, 
          company_name, 
          invoice_date, 
          due_date, 
          bill_to, 
          company_email, 
          invoice_number,
          total_amount,
          amount_paid,
          payment_method,
          raw_data,
          processed_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING id`,
        [
          fileId,
          fileName,
          extractedData.Info?.["Company Name"] || null,
          extractedData.Info?.["Invoice Date"]
            ? new Date(extractedData.Info["Invoice Date"])
            : null,
          extractedData.Info?.["Due Date"]
            ? new Date(extractedData.Info["Due Date"])
            : null,
          extractedData.Info?.["Bill To"] || null,
          extractedData.Info?.["Company Email"] || null,
          extractedData.Info?.["Invoice Number"] || null,
          extractedData.Total || 0,
          extractedData["Amount Paid"] || 0,
          extractedData["Payment Method"] || null,
          JSON.stringify(extractedData),
          processedAt,
        ]
      );

      const invoiceId = invoiceResult.rows[0].id;

      // 2. Save each cleaning entry if they exist
      if (
        extractedData["Cleaning Data"] &&
        Array.isArray(extractedData["Cleaning Data"])
      ) {
        const cleaningDataEntries = extractedData["Cleaning Data"];

        for (const entry of cleaningDataEntries) {
          await client.query(
            `INSERT INTO invoice_items (
              invoice_id,
              service_date,
              service_address,
              service_type,
              notes,
              cost,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              invoiceId,
              entry["Cleaning Date"]
                ? new Date(
                    `${new Date().getFullYear()}-${this.parseMonth(
                      entry["Cleaning Date"]
                    )}-${this.parseDay(entry["Cleaning Date"])}`
                  )
                : null,
              entry["Cleaning Address"] || null,
              entry["Cleaning Type"] || null,
              entry["Notes"] || null,
              entry["Cost"] || 0,
            ]
          );
        }
      }

      // 3. Create a notification for this invoice
      await client.query(
        `INSERT INTO notifications (
          title,
          message,
          type,
          data,
          is_read,
          created_at
        ) VALUES ($1, $2, $3, $4, false, NOW())`,
        [
          `New Invoice from ${
            extractedData.Info?.["Company Name"] || "Unknown"
          }`,
          `A new invoice for $${extractedData.Total || 0} has been processed.`,
          "invoice",
          JSON.stringify({
            invoiceId,
            fileId,
            fileName,
            total: extractedData.Total || 0,
          }),
        ]
      );

      await client.query("COMMIT");

      return {
        success: true,
        invoiceId,
        message: "Invoice data saved successfully",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saving invoice data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper method to parse month from string like "Mar 14"
  static parseMonth(dateString) {
    const months = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };

    const monthStr = dateString.substring(0, 3).toLowerCase();
    return months[monthStr] || "01";
  }

  // Helper method to parse day from string like "Mar 14"
  static parseDay(dateString) {
    const dayMatch = dateString.match(/\d+/);
    return dayMatch ? dayMatch[0].padStart(2, "0") : "01";
  }

  static async getInvoiceById(invoiceId) {
    const client = await pool.connect();

    try {
      const invoiceResult = await client.query(
        `SELECT * FROM invoices WHERE id = $1`,
        [invoiceId]
      );

      if (invoiceResult.rows.length === 0) {
        return null;
      }

      const invoice = invoiceResult.rows[0];

      // Get invoice items
      const itemsResult = await client.query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY service_date`,
        [invoiceId]
      );

      return {
        ...invoice,
        items: itemsResult.rows,
      };
    } catch (error) {
      console.error("Error retrieving invoice:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async markInvoiceAsRead(notificationId) {
    const client = await pool.connect();

    try {
      await client.query(
        `UPDATE notifications SET is_read = true WHERE id = $1`,
        [notificationId]
      );

      return { success: true };
    } catch (error) {
      console.error("Error marking invoice as read:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default InvoiceService;
