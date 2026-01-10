const db = require('./db');

async function insertUser() {
    try {
        await db.initDb();
        const email = '01fe24bcs420@kletech.ac.in';

        // Check if exists
        const check = await db.query("SELECT id FROM users WHERE username=$1", [email]);
        if (check.rows.length > 0) {
            console.log("User already exists with ID:", check.rows[0].id);
            process.exit(0);
        }

        // Insert
        // Hash is dummy
        const res = await db.query(
            "INSERT INTO users (username, password, name, company) VALUES ($1, $2, $3, $4) RETURNING id",
            [email, '$2a$10$dummyhash', 'Test Peer 420', 'MongoDB Inc']
        );
        console.log("Created user with ID:", res.rows[0].id);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

insertUser();
