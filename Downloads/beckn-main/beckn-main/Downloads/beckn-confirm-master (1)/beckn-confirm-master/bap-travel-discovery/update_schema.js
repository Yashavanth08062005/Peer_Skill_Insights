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
        console.log('🔄 Altering table schema...');

        // Update destination column
        await pool.query('ALTER TABLE bookings ALTER COLUMN destination TYPE varchar(255);');
        console.log('✅ Updated destination column to varchar(255)');

        // Update origin column (good practice to keep them consistent)
        await pool.query('ALTER TABLE bookings ALTER COLUMN origin TYPE varchar(255);');
        console.log('✅ Updated origin column to varchar(255)');

    } catch (err) {
        const fs = require('fs');
        fs.writeFileSync('schema_error.log', JSON.stringify(err, null, 2) + '\n' + err.stack);
        console.error('❌ Error updating schema:', err.message);
    } finally {
        await pool.end();
    }
})();
