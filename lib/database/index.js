import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Singleton pattern to ensure only one pool exists
let _pool;

const getPool = () => {
  if (!_pool) {
    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      // Performance optimizations
      connectionTimeoutMillis: 10000, // 10 seconds is sufficient for most queries
      idleTimeoutMillis: 30000, // Free up connections after 30 seconds of idle time
      max: 10, // Limit to 10 concurrent connections
      allowExitOnIdle: true, // Allow pool to clean up during idle periods
    };

    _pool = new Pool(poolConfig);

    // Connection monitoring
    _pool.on("connect", () => {
      // Avoid logging every connection for production
      if (process.env.NODE_ENV !== "production") {
        console.debug("New database connection established");
      }
    });

    _pool.on("error", (err) => {
      console.error("Unexpected database pool error:", err);
    });

    // Add connection statistics logging
    if (process.env.NODE_ENV !== "production") {
      setInterval(() => {
        console.debug(
          `DB pool stats - total: ${_pool.totalCount}, idle: ${_pool.idleCount}, waiting: ${_pool.waitingCount}`
        );
      }, 60000); // Log once per minute in dev mode
    }
  }

  return _pool;
};

// Export a function that gets the singleton pool
export const pool = getPool();

// Export a helper function for queries to simplify usage and error handling
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries for optimization opportunities
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms): ${text}`);
    }
    return res;
  } catch (error) {
    console.error(`Query error: ${error.message}`, { text, params });
    throw error;
  }
};
