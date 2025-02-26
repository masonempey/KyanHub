// lib/services/userService.js
import { pool } from "@/lib/database";

const getUserById = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw new Error(`Failed to get user: ${error.message}`);
  }
};

const getUserByEmail = async (email) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw error;
  }
};

// Other methods (example)
const getAllUsers = async () => {
  const { rows } = await pool.query("SELECT * FROM users");
  return rows;
};

const createUser = async (userId, email, roleId) => {
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (user_id, email, role_id) VALUES ($1, $2, $3) RETURNING *",
      [userId, email, roleId]
    );
    return rows[0];
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};

const getRoleById = async (roleId) => {
  const { rows } = await pool.query("SELECT * FROM roles WHERE id = $1", [
    roleId,
  ]);
  return rows[0] || null;
};

const getDefaultRoleId = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM roles WHERE role = 'user' LIMIT 1"
    );
    if (!rows[0]) {
      const { rows: inserted } = await pool.query(
        "INSERT INTO roles (role) VALUES ('user') RETURNING id"
      );
      return inserted[0].id;
    }
    return rows[0].id;
  } catch (error) {
    console.error("Error in getDefaultRoleId:", error);
    throw error;
  }
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  getRoleById,
  getUserByEmail,
  getDefaultRoleId,
};
