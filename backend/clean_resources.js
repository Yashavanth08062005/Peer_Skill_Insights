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

        console.log("🧹 Cleaning up duplicate resources...");

        // Delete duplicates keeping the one with the lowest ID
        const res = await pool.query(`
            DELETE FROM resources a USING resources b
            WHERE a.id > b.id
            AND a.user_id = b.user_id
            AND a.skill = b.skill
            AND a.title = b.title
            AND a.url = b.url
            AND a.author = b.author;
        `);

        console.log(`✅ Deleted ${res.rowCount} duplicate resource(s).`);

    } catch (e) {
        console.error("❌ Cleanup Error:", e);
    } finally {
        pool.end();
    }
}

run();
