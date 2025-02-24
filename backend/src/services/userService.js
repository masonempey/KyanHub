const { pool } = require("../../database/initDatabase");

class UserService {
  static async getAllUsers() {
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM users");
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getUserById(uid) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM users WHERE user_id = $1",
        [uid]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getUserByEmail(email) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async createUser(uid, email, roleId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "INSERT INTO users (user_id, email, role_id) VALUES ($1, $2, $3) RETURNING *",
        [uid, email, roleId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async deleteUserById(uid) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "DELETE FROM users WHERE user_id = $1 RETURNING *",
        [uid]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async updateUserById(uid, email, roleId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE users SET email = COALESCE($1, email), role_id = COALESCE($2, role_id)
         WHERE user_id = $3 RETURNING *`,
        [email, roleId, uid]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getDefaultRoleId() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id FROM roles WHERE role = 'user'"
      );
      return result.rows.length > 0 ? result.rows[0].id : null;
    } finally {
      client.release();
    }
  }

  static async getRoleById(roleId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT role FROM roles WHERE id = $1",
        [roleId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = UserService;
