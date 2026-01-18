const { Pool } = require('pg');
const fs = require('fs');

const tryConnect = async (password) => {
    const pool = new Pool({
        host: 'localhost',
        user: 'postgres',
        password: password,
        database: 'postgres', // Connect to default DB
        port: 5432,
    });

    try {
        await pool.query('SELECT 1');
        const msg = `SUCCESS with password: '${password}'\n`;
        console.log(msg);
        fs.appendFileSync('creds_result.txt', msg);

        // List databases
        const res = await pool.query('SELECT datname FROM pg_database WHERE datisfalse = false');
        const dbs = "Databases: " + JSON.stringify(res.rows.map(r => r.datname));
        console.log(dbs);
        fs.appendFileSync('creds_result.txt', dbs + "\n");
        return true;
    } catch (e) {
        console.log(`Failed with password '${password}': ${e.message}`);
        return false;
    } finally {
        await pool.end();
    }
};

(async () => {
    // clean result file
    fs.writeFileSync('creds_result.txt', '');
    const passwords = ['postgres', 'password', 'admin', 'root', '1234', '12345'];
    for (const p of passwords) {
        if (await tryConnect(p)) break;
    }
})();
