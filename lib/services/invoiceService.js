import { pool } from "@/lib/database";

class InvoiceService {
  static async saveInvoiceData(invoiceData) {
    try {
      const { fileId, fileName, extractedData, processedAt } = invoiceData;

      const result = await pool.query(
        `INSERT INTO invoice_data (file_id, file_name, extracted_data, processed_at) 
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [fileId, fileName, JSON.stringify(extractedData), processedAt]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error saving invoice data:", error);
      throw error;
    }
  }
}

export default InvoiceService;
