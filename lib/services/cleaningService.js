import { pool } from "@/lib/database";

class CleaningService {
  static async insertCleaning(CleaningData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      console.log("Inserting Cleaning data:", CleaningData);

      await client.query(
        `INSERT INTO cleanings (
         property_uid, company, cost, description, date
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          CleaningData.propertyId,
          CleaningData.company,
          CleaningData.cost,
          CleaningData.description,
          CleaningData.date,
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

  static async getCleaningByProperty(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          id,
          company,
          cost,
          description,
          date,
          TO_CHAR(date, 'YYYY-MM') as month
        FROM cleanings
        WHERE property_uid = $1 
        ORDER BY date DESC`,
        [propertyId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async deleteCleaning(cleaningId) {
    if (typeof cleaningId === "undefined") {
      throw new Error("cleaningId is required");
    }

    const client = await pool.connect();
    try {
      await client.query("DELETE FROM cleanings WHERE id = $1", [cleaningId]);
    } finally {
      client.release();
    }
  }

  static async getCleaningCostsByMonth(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          TO_CHAR(date, 'YYYY-MM') as month,
          SUM(cost) as total_cost,
          json_agg(json_build_object(
            'company', company,
            'cost', cost,
            'description', description,
            'date', date
          )) as Cleaning_items
        FROM cleanings
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

  static async getCompanies() {
    const client = await pool.connect();
    try {
      const result = await pool.query("SELECT * FROM cleaning_companies");
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async insertCompany(companyName) {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO cleaning_companies (
          company_name
        ) VALUES ($1)`,
        [companyName]
      );
    } finally {
      client.release();
    }
  }

  static async deleteCompany(companyName) {
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM cleaning_companies WHERE company_name = $1`,
        [companyName]
      );
    } finally {
      client.release();
    }
  }
}

module.exports = CleaningService;
