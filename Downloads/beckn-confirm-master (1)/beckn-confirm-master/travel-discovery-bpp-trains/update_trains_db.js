const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'trains_bpp',
    password: 'postgres', // Based on typical setup, verify if env.js differs
    port: 5432,
});

async function updateData() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        console.log('Updating train data...');

        const updates = [
            { old: 'Bangalore', new: 'BLR' },
            { old: 'Chennai', new: 'MAA' },
            { old: 'Hyderabad', new: 'HYD' },
            { old: 'Delhi', new: 'DEL' },
            { old: 'Mumbai', new: 'BOM' },
            { old: 'Goa', new: 'GOI' }
        ];

        for (const update of updates) {
            // Update departure_city
            const resDep = await client.query(`
                UPDATE trains 
                SET departure_city = $1 
                WHERE departure_city = $2
            `, [update.new, update.old]);

            if (resDep.rowCount > 0) {
                console.log(`Updated ${resDep.rowCount} trains departing from ${update.old} -> ${update.new}`);
            }

            // Update arrival_city
            const resArr = await client.query(`
                UPDATE trains 
                SET arrival_city = $1 
                WHERE arrival_city = $2
            `, [update.new, update.old]);

            if (resArr.rowCount > 0) {
                console.log(`Updated ${resArr.rowCount} trains arriving at ${update.old} -> ${update.new}`);
            }
        }

        client.release();
    } catch (err) {
        console.error('Error updating database:', err);
    } finally {
        pool.end();
    }
}

updateData();
