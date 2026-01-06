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
        console.log("🔌 Connecting to DB...");

        console.log("🛠️ Checking 'resources' table columns...");

        await pool.query("ALTER TABLE resources ADD COLUMN IF NOT EXISTS author VARCHAR(255)");
        console.log("✅ Ensured 'author' column exists.");

        await pool.query("ALTER TABLE resources ADD COLUMN IF NOT EXISTS peer_index INT");
        console.log("✅ Ensured 'peer_index' column exists.");

        console.log("🎉 Schema fix complete.");
    } catch (e) {
        console.error("❌ Schema Fix Error:", e);
    } finally {
        pool.end();
    }
}

run();
