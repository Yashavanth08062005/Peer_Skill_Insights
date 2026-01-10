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

        // 1. Ensure Company is TEXT
        try {
            await pool.query("ALTER TABLE peers ALTER COLUMN company TYPE TEXT");
            console.log("✅ Converted peers.company to TEXT");
        } catch (e) {
            console.log("ℹ️ Company column update note:", e.message);
        }

        // 2. Remove Duplicates
        console.log("🧹 Removing duplicate peers...");
        // Keep the one with highest ID (latest)
        const dedupRes = await pool.query(`
        DELETE FROM peers a USING peers b
        WHERE a.id < b.id 
        AND a.user_id = b.user_id 
        AND a.name = b.name;
    `);
        console.log(`✅ Removed ${dedupRes.rowCount} duplicate peer(s).`);

        // 3. Add Unique Constraint
        console.log("🔒 Adding unique constraint...");
        try {
            await pool.query("ALTER TABLE peers ADD CONSTRAINT unique_peer_name UNIQUE (user_id, name)");
            console.log("✅ Unique constraint added.");
        } catch (e) {
            console.log("ℹ️ Unique constraint note:", e.message);
        }

    } catch (e) {
        console.error("❌ Cleanup Error:", e);
    } finally {
        pool.end();
    }
}

run();
