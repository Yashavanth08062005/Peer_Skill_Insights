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
        const email = '01fe24bcs418@kletech.ac.in'; // Target user
        console.log(`Checking skills for: ${email}`);

        const userRes = await pool.query('SELECT id FROM users WHERE username=$1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found.');
            return;
        }

        const userId = userRes.rows[0].id;
        console.log(`User ID: ${userId}`);

        const skillsRes = await pool.query('SELECT skill, company FROM skills WHERE user_id=$1', [userId]);
        console.log(`Skills count: ${skillsRes.rows.length}`);
        skillsRes.rows.forEach(r => console.log(` - ${r.skill} (${r.company})`));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
