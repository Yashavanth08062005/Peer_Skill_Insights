const { Pool } = require('pg');

async function checkTrains() {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'trains_bpp',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM trains LIMIT 3');
        console.log('Available trains:');
        result.rows.forEach(train => {
            console.log(`- ${train.train_name} (${train.train_number}): ${train.departure_station} → ${train.arrival_station}`);
        });
        client.release();
        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
    }
}

checkTrains();