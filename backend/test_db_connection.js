const db = require('./db');

(async () => {
    try {
        console.log("Testing DB connection...");
        await db.initDb();
        console.log("Querying users table...");
        const res = await db.query('SELECT * FROM users LIMIT 1');
        console.log("User count:", res.rows.length);
        console.log("DB Connection SUCCESS");
        process.exit(0);
    } catch (err) {
        console.error("DB Connection FAILED:", err);
        process.exit(1);
    }
})();
