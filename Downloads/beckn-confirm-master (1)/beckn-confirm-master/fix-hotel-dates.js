const { Pool } = require('pg');

async function fixHotel() {
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'travel_discovery',
        user: 'postgres',
        password: '2005',
    });
    
    try {
        const client = await pool.connect();
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + 1);
        checkIn.setHours(14, 0, 0, 0);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 2);
        checkOut.setHours(11, 0, 0, 0);
        
        await client.query('UPDATE bookings SET check_in_date = $1, check_out_date = $2 WHERE booking_reference = $3', 
            [checkIn.toISOString(), checkOut.toISOString(), 'BK72745426']);
        console.log('Fixed hotel booking BK72745426');
        client.release();
        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        await pool.end();
    }
}

fixHotel();