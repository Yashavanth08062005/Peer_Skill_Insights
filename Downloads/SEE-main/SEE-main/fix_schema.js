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

        // Fix users table
        console.log("🛠️ Checking 'users' table columns...");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS meta TEXT");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT");
        console.log("✅ Ensured 'name', 'meta', 'avatar' columns exist in 'users'.");

        // Fix peers constraint
        console.log("🛠️ Removing unique constraint from 'peers' table...");
        try {
            await pool.query("ALTER TABLE peers DROP CONSTRAINT IF EXISTS unique_peer_user_id");
            console.log("✅ Dropped 'unique_peer_user_id' constraint.");
        } catch (e) {
            console.log("⚠️ Could not drop 'unique_peer_user_id' (might not exist):", e.message);
        }

        try {
            await pool.query("ALTER TABLE peers DROP CONSTRAINT IF EXISTS peers_user_id_key");
            console.log("✅ Dropped 'peers_user_id_key' constraint.");
        } catch (e) {
            console.log("⚠️ Could not drop 'peers_user_id_key' (might not exist):", e.message);
        }

        await pool.query("ALTER TABLE peers ADD COLUMN IF NOT EXISTS company VARCHAR(255)");
        console.log("✅ Ensured 'company' column exists in 'peers'.");

        await pool.query("ALTER TABLE peers ADD COLUMN IF NOT EXISTS company VARCHAR(255)");
        console.log("✅ Ensured 'company' column exists in 'peers'.");

        // Fix resources duplicates
        console.log("🛠️ Adding unique constraint to 'resources' table...");
        try {
            await pool.query("ALTER TABLE resources ADD CONSTRAINT unique_resource_entry UNIQUE (user_id, skill, url)");
            console.log("✅ Added 'unique_resource_entry' constraint.");
        } catch (e) {
            console.log("⚠️ Could not add constraint (might already exist or duplicates present):", e.message);
        }

        console.log("🎉 Schema fix complete.");
    } catch (e) {
        console.error("❌ Schema Fix Error:", e);
    } finally {
        pool.end();
    }
}

run();
