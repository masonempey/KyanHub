import { pool, query } from "@/lib/database";

class OwnerService {
  /**
   * Get a single owner by ID
   */
  static async getOwnerById(ownerId) {
    try {
      const result = await query(
        `SELECT * FROM property_owners WHERE id = $1`,
        [ownerId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching owner:", error);
      throw error;
    }
  }

  /**
   * Get all owners
   */
  static async getAllOwners() {
    try {
      const result = await query(
        `SELECT * FROM property_owners ORDER BY name ASC`
      );

      return result.rows;
    } catch (error) {
      console.error("Error fetching owners:", error);
      throw error;
    }
  }

  /**
   * Create a new owner
   */
  static async createOwner({ name, email, address, notes }) {
    try {
      const result = await query(
        `INSERT INTO property_owners 
         (name, email, address, notes, date_added)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)
         RETURNING *`,
        [name, email, address, notes]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error creating owner:", error);
      throw error;
    }
  }

  /**
   * Update an existing owner
   */
  static async updateOwner(
    ownerId,
    { name, email, phone, address, notes, date_added, template_id }
  ) {
    try {
      const result = await query(
        `UPDATE property_owners
         SET name = $1, email = $2, address = $3, notes = $4, 
             date_added = $5, template_id = $6
         WHERE id = $7
         RETURNING *`,
        [name, email, address, notes, date_added, template_id, ownerId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error("Error updating owner:", error);
      throw error;
    }
  }

  /**
   * Delete an owner
   */
  static async deleteOwner(ownerId) {
    try {
      const result = await query(
        `DELETE FROM property_owners WHERE id = $1 RETURNING id`,
        [ownerId]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting owner:", error);
      throw error;
    }
  }

  /**
   * Get properties for a specific owner
   */
  static async getOwnerProperties(ownerId) {
    try {
      // First verify the owner exists
      const ownerExists = await this.ownerExists(ownerId);
      if (!ownerExists) {
        throw new Error("Owner not found");
      }

      const result = await query(
        `SELECT op.*, p.name as property_name 
         FROM owner_properties op
         JOIN properties p ON op.property_uid = p.property_uid
         WHERE op.owner_id = $1
         ORDER BY op.ownership_date DESC`,
        [ownerId]
      );

      return result.rows;
    } catch (error) {
      console.error("Error fetching owner properties:", error);
      throw error;
    }
  }

  /**
   * Assign a property to an owner
   */
  static async assignProperty(
    ownerId,
    propertyUid,
    ownershipPercentage = 100,
    ownershipDate = null
  ) {
    try {
      // Verify owner exists
      const ownerExists = await this.ownerExists(ownerId);
      if (!ownerExists) {
        throw new Error("Owner not found");
      }

      // Verify property exists
      const propertyExists = await this.propertyExists(propertyUid);
      if (!propertyExists) {
        throw new Error("Property not found");
      }

      // Check for existing assignment
      const existingAssignment = await query(
        `SELECT id FROM owner_properties 
         WHERE owner_id = $1 AND property_uid = $2`,
        [ownerId, propertyUid]
      );

      if (existingAssignment.rows.length > 0) {
        throw new Error("This property is already assigned to this owner");
      }

      // Create the assignment
      const result = await query(
        `INSERT INTO owner_properties 
         (owner_id, property_uid, ownership_percentage, ownership_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          ownerId,
          propertyUid,
          ownershipPercentage,
          ownershipDate || new Date().toISOString().split("T")[0],
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error assigning property:", error);
      throw error;
    }
  }

  /**
   * Remove a property from an owner
   */
  static async removeProperty(ownerId, propertyUid) {
    try {
      const result = await query(
        `DELETE FROM owner_properties 
         WHERE owner_id = $1 AND property_uid = $2
         RETURNING id`,
        [ownerId, propertyUid]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error removing property:", error);
      throw error;
    }
  }

  /**
   * Check if an owner exists
   */
  static async ownerExists(ownerId) {
    try {
      const result = await query(
        `SELECT id FROM property_owners WHERE id = $1`,
        [ownerId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking owner existence:", error);
      throw error;
    }
  }

  /**
   * Check if a property exists
   */
  static async propertyExists(propertyUid) {
    try {
      const result = await query(
        `SELECT property_uid FROM properties WHERE property_uid = $1`,
        [propertyUid]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking property existence:", error);
      throw error;
    }
  }
}

export default OwnerService;
