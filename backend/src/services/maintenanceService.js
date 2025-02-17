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

  static async getMaintenanceByProperty(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          category,
          company,
          cost,
          description,
          date,
          TO_CHAR(date, 'YYYY-MM') as month
        FROM maintenance 
        WHERE property_uid = $1 
        ORDER BY date DESC`,
        [propertyId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getMaintenanceCostsByMonth(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          TO_CHAR(date, 'YYYY-MM') as month,
          SUM(cost) as total_cost,
          json_agg(json_build_object(
            'category', category,
            'company', company,
            'cost', cost,
            'description', description,
            'date', date
          )) as maintenance_items
        FROM maintenance 
        WHERE property_uid = $1 
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month DESC`,
        [propertyId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = MaintenanceService;
