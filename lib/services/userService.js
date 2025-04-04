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

const userService = {
  getAllUsers,
  getUserById,
  createUser,
  getRoleById,
  getUserByEmail,
  getDefaultRoleId,
};

export default userService;
