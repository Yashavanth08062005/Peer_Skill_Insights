const { Pool } = require('pg');

async function checkLatest() {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM bookings WHERE booking_reference = $1', ['BK81992759']);
        const booking = result.rows[0];
        console.log('Latest train booking (BK81992759):');
        console.log(`Name: ${booking.item_name}`);
        console.log(`Route: ${booking.origin} → ${booking.destination}`);
        console.log(`Status: ${booking.booking_status}`);
        client.release();
        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
    }
}

checkLatest();