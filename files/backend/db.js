
require("dotenv").config();

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("NEON_DB_CONFIG_ERROR: DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on("connect", () => {
  console.log("NEON_DB_POOL: connection established");
});

pool.on("error", (err) => {
  console.error("NEON_DB_POOL_ERROR code:", err.code);
  console.error("NEON_DB_POOL_ERROR message:", err.message);
});

// Temporary database connection diagnostic
pool
  .query("SELECT NOW() AS server_time")
  .then((result) => {
    console.log("NEON_DB_TEST: connected");
    console.log(
      "NEON_DB_TEST server time:",
      result.rows[0].server_time
    );
  })
  .catch((err) => {
    console.error("NEON_DB_TEST error code:", err.code);
    console.error("NEON_DB_TEST error message:", err.message);
  });

module.exports = pool;
