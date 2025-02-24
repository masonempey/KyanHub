const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Neon uses self-signed certs
  },
  connectionTimeoutMillis: 5000, // Timeout after 5s if no connection
  idleTimeoutMillis: 10000, // Close idle connections after 10s
  max: 20, // Max pool size (adjust based on Neon's limits)
});

const initDatabase = async () => {
  let client;
  try {
    console.log("Attempting to connect to Neon PostgreSQL...");
    client = await pool.connect();
    console.log("Connected to Neon PostgreSQL");

    const sqlFilePath = path.join(__dirname, "schemas", "create_tables.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");
    const queries = sql.split(";").filter((query) => query.trim() !== "");

    console.log("Executing schema queries...");
    for (const query of queries) {
      await client.query(query);
    }
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  } finally {
    if (client) {
      client.release();
      console.log("Client released");
    }
  }
};

// Test connection on import (optional, for debugging)
pool.on("connect", () => console.log("Pool connected to Neon"));
pool.on("error", (err) => console.error("Pool error:", err));

module.exports = { pool, initDatabase };
