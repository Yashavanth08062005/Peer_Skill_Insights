const { Pool } = require('pg');

async function checkTrainTimes() {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'trains_bpp',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT train_name, departure_time, arrival_time FROM trains LIMIT 3');
        console.log('Train departure times in database:');
        result.rows.forEach(train => {
            console.log(`- ${train.train_name}: Dep ${train.departure_time}, Arr ${train.arrival_time}`);
        });
        client.release();
        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
    }
}

checkTrainTimes();