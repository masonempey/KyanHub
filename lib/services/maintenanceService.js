import { pool } from "@/lib/database";

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
          id,
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

  static async deleteMaintenance(maintenanceId) {
    if (typeof maintenanceId === "undefined") {
      throw new Error("maintenanceId is required");
    }
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM maintenance WHERE id = $1", [
        maintenanceId,
      ]);
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

  static async getCompanies() {
    const client = await pool.connect();
    try {
      const result = await pool.query("SELECT * FROM maintenance_companies");
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getCategories() {
    const client = await pool.connect();
    try {
      const result = await pool.query("SELECT * FROM maintenance_categories");
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async insertCompany(companyName) {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO maintenance_companies (
          company_name,
          google_folder_id
        ) VALUES ($1, $2)`,
        [companyName, googleFolderId]
      );
    } finally {
      client.release();
    }
  }

  static async insertCategory(categoryName) {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO maintenance_categories (
          category
        ) VALUES ($1)`,
        [categoryName]
      );
    } finally {
      client.release();
    }
  }

  static async deleteCompany(companyName) {
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM maintenance_companies WHERE company_name = $1`,
        [companyName]
      );
    } finally {
      client.release();
    }
  }

  static async deleteCategory(categoryName) {
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM maintenance_categories WHERE category = $1`,
        [categoryName]
      );
    } finally {
      client.release();
    }
  }

  static async editCompany(companyName, googleFolderId) {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE maintenance_companies 
       SET google_folder_id = $2
       WHERE company_name = $1`,
        [companyName, googleFolderId]
      );
    } finally {
      client.release();
    }
  }
}

module.exports = MaintenanceService;
