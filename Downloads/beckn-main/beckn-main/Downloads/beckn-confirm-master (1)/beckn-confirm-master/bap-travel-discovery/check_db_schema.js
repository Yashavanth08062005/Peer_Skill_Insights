const db = require('./src/config/database');
const fs = require('fs');

async function checkSchema() {
    try {
        const query = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'bookings'
            ORDER BY ordinal_position;
        `;

        const res = await db.query(query);
        console.log('Schema fetched successfully.');
        fs.writeFileSync('schema_info.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error fetching schema:', err);
        process.exit(1);
    }
}

checkSchema();
