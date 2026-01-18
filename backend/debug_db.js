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
        const email = '01fe24bcs420@kletech.ac.in';
        console.log(`Checking for user: ${email}`);

        const userRes = await pool.query('SELECT * FROM users WHERE username=$1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found.');
            return;
        }

        const user = userRes.rows[0];
        console.log('User found:', user.id);

        const resourcesRes = await pool.query('SELECT * FROM resources WHERE user_id=$1', [user.id]);
        console.log(`Current Resources count: ${resourcesRes.rows.length}`);
        if (resourcesRes.rows.length > 0) {
            console.log("First Resource:", resourcesRes.rows[0]);
        } else {
            console.log("⚠️ No resources found in DB.");
        }

        console.log("🧪 Testing Resource Insert...");
        try {
            await pool.query(
                'INSERT INTO resources (user_id, skill, title, url, note, author, peer_index) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [user.id, 'TestSkill', 'TestTitle', 'http://test.com', 'TestNote', 'TestAuthor', 0]
            );
            console.log("✅ Insert succeeded!");
        } catch (e) {
            console.error("❌ Insert Failed:", e.message);
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
