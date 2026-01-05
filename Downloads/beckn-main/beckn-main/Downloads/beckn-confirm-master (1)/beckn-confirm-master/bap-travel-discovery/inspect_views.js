const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || 'travel_discovery',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '2005',
});

(async () => {
    try {
        const res = await pool.query(`
            SELECT table_name, view_definition
            FROM information_schema.views
            WHERE table_schema = 'public';
        `);
        console.log('Views:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error fetching views:', err);
    } finally {
        await pool.end();
    }
})();
