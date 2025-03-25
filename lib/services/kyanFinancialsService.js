const { pool } = require("@/lib/database");

class KyanFinancialsService {
  static async insertRecord(recordData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if record exists
      const recordExists = await client.query(
        "SELECT 1 FROM kyan_financials WHERE record_code = $1",
        [recordData.recordCode]
      );

      if (recordExists.rowCount > 0) {
        console.log("Record already exists. Skipping insert.");
        await client.query("ROLLBACK");
        return;
      }

      console.log("Inserting record data:", recordData);

      // Insert record
      await client.query(
        `INSERT INTO kyan_financials (
            date_submitted, store, description, cost, receipt_image_url, record_code
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          recordData.dateSubmitted,
          recordData.store,
          recordData.description,
          recordData.cost,
          recordData.receiptImageUrl,
          recordData.recordCode,
        ]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error inserting or updating booking:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRecords() {
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM kyan_financials");
      return result.rows;
    } catch (error) {
      console.error("Error getting kyan_financials:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteRecord(recordCode) {
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM kyan_financials WHERE record_code = $1", [
        recordCode,
      ]);
    } catch (error) {
      console.error("Error deleting record:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default KyanFinancialsService;
