const db = require('./db');

async function check() {
    await db.initDb();
    try {
        const res = await db.query('SELECT id, username, company FROM users');
        console.log("Users:", res.rows);
    } catch (e) {
        console.error(e);
    }
}

check();
