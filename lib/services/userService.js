// lib/services/userService.js
import { pool, query } from "@/lib/database";

export const getUserById = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const result = await query("SELECT * FROM users WHERE user_id = $1", [
      userId,
    ]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw new Error(`Failed to get user: ${error.message}`);
  }
};

export const getUserByEmail = async (email) => {
  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw error;
  }
};

// Other methods (example)
export const getAllUsers = async () => {
  try {
    const result = await query("SELECT * FROM users");
    return result.rows;
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw error;
  }
};

export const createUser = async (userId, email, roleId) => {
  try {
    const result = await query(
      "INSERT INTO users (user_id, email, role_id) VALUES ($1, $2, $3) RETURNING *",
      [userId, email, roleId]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};

export const getRoleById = async (roleId) => {
  try {
    const result = await query("SELECT * FROM roles WHERE id = $1", [roleId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error in getRoleById:", error);
    throw error;
  }
};

export const getDefaultRoleId = async () => {
  try {
    // Use a transaction for consistency when potentially inserting a new role
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT id FROM roles WHERE role = 'user' LIMIT 1"
      );

      if (!rows[0]) {
        const { rows: inserted } = await client.query(
          "INSERT INTO roles (role) VALUES ('user') RETURNING id"
        );
        await client.query("COMMIT");
        return inserted[0].id;
      }

      await client.query("COMMIT");
      return rows[0].id;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getDefaultRoleId:", error);
    throw error;
  }
};

/**
 * Get user settings by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User settings
 */
export const getUserSettings = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const result = await query(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error in getUserSettings:", error);
    throw error;
  }
};

/**
 * Update user settings
 * @param {string} userId - User ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
export const updateUserSettings = async (userId, settings) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if user settings already exist
      const checkResult = await client.query(
        "SELECT * FROM user_settings WHERE user_id = $1",
        [userId]
      );

      let result;

      if (checkResult.rows.length > 0) {
        // Update existing settings
        const setClauses = [];
        const values = [];
        let paramCounter = 1;

        // Build dynamic SET clauses based on provided settings
        Object.entries(settings).forEach(([key, value]) => {
          setClauses.push(`${key} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        });

        // Add updated_at timestamp
        setClauses.push(`updated_at = NOW()`);

        // Add userId as the last parameter
        values.push(userId);

        result = await client.query(
          `UPDATE user_settings 
           SET ${setClauses.join(", ")} 
           WHERE user_id = $${paramCounter}
           RETURNING *`,
          values
        );
      } else {
        // Insert new settings
        const columns = [
          "user_id",
          ...Object.keys(settings),
          "created_at",
          "updated_at",
        ];
        const placeholders = [];
        const values = [userId, ...Object.values(settings), "NOW()", "NOW()"];

        // Create placeholders ($1, $2, etc.)
        for (let i = 1; i <= values.length - 2; i++) {
          placeholders.push(`$${i}`);
        }

        // Add NOW() function calls directly without parameters
        placeholders.push("NOW()", "NOW()");

        result = await client.query(
          `INSERT INTO user_settings (${columns.join(", ")}) 
           VALUES (${placeholders.join(", ")}) 
           RETURNING *`,
          [userId, ...Object.values(settings)]
        );
      }

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in updateUserSettings:", error);
    throw error;
  }
};

/**
 * Get system-wide settings
 * @returns {Promise<Object>} System settings
 */
export const getSystemSettings = async () => {
  try {
    const result = await query("SELECT * FROM system_settings WHERE id = 1");
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error in getSystemSettings:", error);
    throw error;
  }
};

/**
 * Update system-wide settings
 * @param {Object} settings - Settings to update
 * @returns {Promise<Object>} Updated settings
 */
export const updateSystemSettings = async (settings) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if system settings already exist
      const checkResult = await client.query(
        "SELECT * FROM system_settings WHERE id = 1"
      );

      let result;

      if (checkResult.rows.length > 0) {
        // Update existing settings
        const setClauses = [];
        const values = [];
        let paramCounter = 1;

        // Build dynamic SET clauses based on provided settings
        Object.entries(settings).forEach(([key, value]) => {
          setClauses.push(`${key} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        });

        // Add updated_at timestamp
        setClauses.push(`updated_at = NOW()`);

        result = await client.query(
          `UPDATE system_settings 
           SET ${setClauses.join(", ")} 
           WHERE id = 1
           RETURNING *`,
          values
        );
      } else {
        // Insert new settings
        const columns = [
          "id",
          ...Object.keys(settings),
          "created_at",
          "updated_at",
        ];
        const placeholders = ["$1"];
        const values = [1, ...Object.values(settings)];

        // Create placeholders ($2, $3, etc. for settings values)
        for (let i = 2; i <= values.length; i++) {
          placeholders.push(`$${i}`);
        }

        // Add NOW() function calls for timestamps
        placeholders.push("NOW()", "NOW()");

        result = await client.query(
          `INSERT INTO system_settings (${columns.join(", ")}) 
           VALUES (${placeholders.join(", ")}) 
           RETURNING *`,
          values
        );
      }

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in updateSystemSettings:", error);
    throw error;
  }
};

const userService = {
  getAllUsers,
  getUserById,
  createUser,
  getRoleById,
  getUserByEmail,
  getDefaultRoleId,
  getUserSettings,
  updateUserSettings,
  getSystemSettings,
  updateSystemSettings,
};

export default userService;
