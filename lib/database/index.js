const { Pool } = require("pg");
require("dotenv").config();

let _pool;

const getPool = () => {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
      allowExitOnIdle: true,
    });

    _pool.on("connect", () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("Database connection established");
      }
    });

    _pool.on("error", (err) => {
      console.error("Database pool error:", err);
    });
  }
  return _pool;
};

const pool = getPool();

const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
};

module.exports = { pool, query };
