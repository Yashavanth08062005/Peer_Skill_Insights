const { Pool } = require('pg');

const tryConnect = async (password) => {
    const pool = new Pool({
        host: 'localhost',
        user: 'postgres',
        password: 2005,
        database: 'peer_skill_insights', // Connect to default DB
        port: 5432,
    });

    try {
        await pool.query('SELECT 1');
        console.log(`SUCCESS with password: '${password}'`);

        // List databases
        const res = await pool.query('SELECT datname FROM pg_database WHERE datisfalse = false');
        console.log("Databases:", res.rows.map(r => r.datname));
        return true;
    } catch (e) {
        console.log(`Failed with password '${password}': ${e.message}`);
        return false;
    } finally {
        await pool.end();
    }
};

(async () => {
    const passwords = ['postgres', 'password', 'admin', 'root', '1234', '12345'];
    for (const p of passwords) {
        if (await tryConnect(p)) break;
    }
})();
