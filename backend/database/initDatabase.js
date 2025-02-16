const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDatabase = async () => {
  try {
    const sqlFilePath = path.join(__dirname, "schemas", "create_tables.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    console.log("Executing SQL:\n", sql);

    await pool.query(sql);
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
};

module.exports = { pool, initDatabase };
