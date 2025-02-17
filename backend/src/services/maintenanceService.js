const { pool } = require("../../database/initDatabase");

class MaintenanceService {
  static async insertMaintenance(maintenanceData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      console.log("Inserting maintenance data:", maintenanceData);

      await client.query(
        `INSERT INTO maintenance (
         property_uid, category, company, cost, description, date
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          maintenanceData.propertyId,
          maintenanceData.category,
          maintenanceData.company,
          maintenanceData.cost,
          maintenanceData.description,
          maintenanceData.date,
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
}

module.exports = MaintenanceService;
