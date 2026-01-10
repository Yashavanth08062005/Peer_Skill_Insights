const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    console.log("🔗 Connected to DB...");

    // 1. Remove Duplicates
    console.log("🧹 Removing duplicate user_id entries in peers...");
    // Keep the one with highest ID (latest)
    const dedupRes = await pool.query(`
      DELETE FROM peers a USING peers b
      WHERE a.id < b.id 
      AND a.user_id = b.user_id;
    `);
    console.log(`✅ Removed ${dedupRes.rowCount} duplicate peer(s).`);

    // 2. Add Unique Constraint
    console.log("🔒 Adding unique constraint to user_id...");
    try {
        await pool.query("ALTER TABLE peers ADD CONSTRAINT unique_peer_user_id UNIQUE (user_id)");
        console.log("✅ Unique constraint 'unique_peer_user_id' added.");
    } catch (e) {
        console.log("ℹ️ Constraint might already exist or failed:", e.message);
    }

  } catch (e) {
    console.error("❌ Cleanup Error:", e);
  } finally {
    pool.end();
  }
}

run();
