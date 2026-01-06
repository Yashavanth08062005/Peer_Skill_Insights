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
        console.log("🗑️ Deleting test resource...");
        await pool.query("DELETE FROM resources WHERE title = 'TestTitle'");
        console.log("✅ Deleted 'TestTitle' resource.");

        console.log("🔍 Verifying remaining resources for user 1...");
        const res = await pool.query("SELECT * FROM resources WHERE user_id=1");
        console.log("Remaining resources:", res.rows);

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        pool.end();
    }
}

run();
