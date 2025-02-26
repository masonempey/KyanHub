// lib/database/index.js
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 20,
};

const pool = new Pool(poolConfig);

const initDatabase = async () => {
  let client;
  try {
    console.log("Attempting to connect to PostgreSQL...");
    client = await pool.connect();
    console.log("Connected to PostgreSQL");

    const sqlFilePath = path.join(
      process.cwd(),
      "lib",
      "database",
      "create_tables.sql"
    );
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

// Event listeners for debugging
pool.on("connect", () => console.log("Pool connected to PostgreSQL"));
pool.on("error", (err) => console.error("Pool error:", err));

// Export pool and init function
export { pool, initDatabase };
