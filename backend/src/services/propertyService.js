const { pool } = require("../../database/initDatabase");

class PropertyService {
  static async upsertProperties(properties) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const property of properties) {
        const query = `
          INSERT INTO properties (
            property_uid, name, address
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (property_uid) 
          DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address
        `;

        const values = [property.property_uid, property.name, property.address];

        await client.query(query, values);
      }

      await client.query("COMMIT");
      console.log("Properties synchronized successfully");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error syncing properties:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PropertyService;
