import { pool } from "@/lib/database";

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

  static async getPropertyById(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          property_uid,
          name,
          address,
          google_sheet_id,
          google_folder_id
        FROM properties 
        WHERE property_uid = $1`,
        [propertyId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async updateProperty(propertyId, propertyData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const query = `
        UPDATE properties
        SET
          name = $1,
          address = $2,
          bedrooms = $3,
          bathrooms = $4,
          sqft = $5,
          google_sheet_id = $6,
          google_folder_id = $7
        WHERE property_uid = $8
      `;

      const values = [
        propertyData.name || null,
        propertyData.address || null,
        propertyData.bedrooms ? parseInt(propertyData.bedrooms, 10) : null,
        propertyData.bathrooms ? parseFloat(propertyData.bathrooms) : null,
        propertyData.sqft ? parseInt(propertyData.sqft, 10) : null,
        propertyData.GoogleSheetId || null,
        propertyData.GoogleFolderId || null,
        propertyId,
      ];

      await client.query(query, values);
      await client.query("COMMIT");
      console.log("Property updated successfully");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating property:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getFolderID(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT google_folder_id FROM properties WHERE property_uid = $1`,
        [propertyId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Property ${propertyId} not found`);
      }

      return result.rows[0].google_folder_id;
    } finally {
      client.release();
    }
  }

  static async getClientSheetID(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT google_sheet_id FROM properties WHERE property_uid = $1`,
        [propertyId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Property ${propertyId} not found`);
      }

      return result.rows[0].google_sheet_id;
    } finally {
      client.release();
    }
  }

  /**
   * Get the owner of a property
   */
  static async getPropertyOwner(propertyId) {
    try {
      // Get more information including the ownership percentage
      const result = await query(
        `SELECT op.*, po.name as owner_name
         FROM owner_properties op
         JOIN property_owners po ON op.owner_id = po.id
         WHERE op.property_uid = $1
         LIMIT 1`,
        [propertyId]
      );

      console.log(
        `PropertyService.getPropertyOwner lookup for ${propertyId}: ${result.rows.length} results`
      );

      if (result.rows.length > 0) {
        console.log(
          `Found owner "${result.rows[0].owner_name}" with ${result.rows[0].ownership_percentage}% ownership`
        );
      } else {
        console.log(`No owner found for property ${propertyId}`);
      }

      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error getting property owner for ${propertyId}:`, error);
      throw error;
    }
  }

  static async getAllOwnersForProperty(propertyId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT op.*, p.name as property_name, o.name as owner_name, o.email, o.id, o.template_id,
        op.ownership_percentage
       FROM owner_properties op
       JOIN properties p ON op.property_uid = p.property_uid
       JOIN property_owners o ON op.owner_id = o.id
       WHERE op.property_uid = $1
       ORDER BY op.ownership_date DESC`,
        [propertyId]
      );

      // Map the results to a more usable format
      return result.rows.map((owner) => ({
        id: owner.id,
        name: owner.owner_name,
        email: owner.email,
        template_id: owner.template_id,
        ownership_percentage: owner.ownership_percentage,
      }));
    } finally {
      client.release();
    }
  }
}

module.exports = PropertyService;
