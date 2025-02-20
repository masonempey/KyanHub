const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

const initDatabase = async () => {
  try {
    const sqlFilePath = path.join(__dirname, "schemas", "create_tables.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Split SQL into individual statements (handles multiple queries)
    const queries = sql.split(";").filter((query) => query.trim() !== "");

    const client = await pool.connect();
    try {
      for (const query of queries) {
        await client.query(query);
      }
      console.log("Database initialized successfully");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

module.exports = { pool, initDatabase };
