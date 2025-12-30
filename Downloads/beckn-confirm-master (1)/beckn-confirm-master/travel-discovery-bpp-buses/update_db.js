const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'buses_bpp',
    user: 'postgres',
    password: '2005',
});

async function updateData() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();

        console.log('Updating bus data...');

        // Update Bangalore -> BLR, Mumbai -> BOM
        const res1 = await client.query(`
            UPDATE buses 
            SET departure_city = 'BLR', arrival_city = 'BOM' 
            WHERE departure_city = 'Bangalore' AND arrival_city = 'Mumbai'
        `);
        console.log(`Updated ${res1.rowCount} rows (Bangalore -> Mumbai to BLR -> BOM)`);

        // Update Bangalore -> Delhi to BLR -> DEL
        const res2 = await client.query(`
            UPDATE buses 
            SET departure_city = 'BLR', arrival_city = 'DEL' 
            WHERE departure_city = 'Bangalore' AND arrival_city = 'Delhi'
        `);
        console.log(`Updated ${res2.rowCount} rows (Bangalore -> Delhi to BLR -> DEL)`);

        // Update Mumbai -> Goa to BOM -> GOI
        const res3 = await client.query(`
            UPDATE buses 
            SET departure_city = 'BOM', arrival_city = 'GOI' 
            WHERE departure_city = 'Mumbai' AND arrival_city = 'Goa'
        `);
        console.log(`Updated ${res3.rowCount} rows (Mumbai -> Goa to BOM -> GOI)`);

        console.log('Verification:');
        const verify = await client.query('SELECT departure_city, arrival_city FROM buses');
        console.table(verify.rows);

        client.release();
    } catch (err) {
        console.error('Error updating database:', err);
    } finally {
        pool.end();
    }
}

updateData();
